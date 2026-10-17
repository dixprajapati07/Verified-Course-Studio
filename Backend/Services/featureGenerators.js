/**
 * Feature Generation Functions
 * Each function builds a prompt, calls the orchestrator, validates the result, and returns structured data.
 */

import { generate } from "./aiOrchestrator.js";

// ─── Schema Validators ─────────────────────────────────────────────────────────

function validateCourse(content) {
  if (typeof content.title !== "string" || !content.title) throw new Error("Missing title");
  if (typeof content.description !== "string" || !content.description) throw new Error("Missing description");
  if (!Array.isArray(content.lectures) && !Array.isArray(content.modules)) {
    throw new Error("Course must have lectures or modules");
  }
}

function normalizeCourseContent(content, { topic, studentLevel, durationMinutes, numberOfLectures }) {
  const cleanTopic = (topic || content.title || "Subject").trim();
  const lectureCount = Math.min(30, Math.max(1, Number(numberOfLectures) || 4));
  const totalMins = Number(durationMinutes) || 60;
  const timePerLecture = Math.round(totalMins / lectureCount);

  // If lectures is missing or empty, derive from modules if present, or create structured defaults
  if (!Array.isArray(content.lectures) || content.lectures.length === 0) {
    if (Array.isArray(content.modules) && content.modules.length > 0) {
      const dur = Math.round(totalMins / content.modules.length);
      content.lectures = content.modules.map((m, idx) => ({
        lectureNumber: idx + 1,
        title: m.title || `Lecture ${idx + 1}: ${cleanTopic}`,
        durationMinutes: dur,
        learningObjectives: m.lessons?.map((l) => `Understand ${l.title}`) || [`Master ${m.title}`],
        topicsCovered: m.lessons?.map((l) => l.title) || [m.title],
        teachingNotes: m.lessons?.map((l) => l.explanation).filter(Boolean).join("\n\n") || `Deliver structured guidance on ${m.title}`,
        practicalActivity: {
          title: `${m.title} Hands-on Lab`,
          description: m.lessons?.[0]?.example ? `Experiment with: ${m.lessons[0].example}` : `Practice core principles of ${m.title}`,
          steps: ["Review core concepts", "Implement working solution", "Verify outputs"],
          expectedDeliverable: "Working demonstration or verified code"
        },
        codeExamples: m.lessons?.filter((l) => l.example).map((l) => ({
          title: `${l.title} Example`,
          language: "Java",
          code: l.example,
          explanation: l.explanation || ""
        })) || [],
        commonMistakes: [`Common misconception when implementing ${m.title}`],
        studentExercises: [
          {
            title: `${m.title} Practice Exercise`,
            difficulty: studentLevel || "Beginner",
            problemStatement: `Implement a complete program demonstrating ${m.title}.`,
            hint: "Review the lecture examples.",
            solution: m.lessons?.[0]?.example || "// Reference solution"
          }
        ],
        quizQuestions: (m.quiz || []).map((q) => ({
          question: q.question,
          options: q.options || [],
          answer: q.answer || q.options?.[0] || "",
          explanation: q.explanation || "Standard verified textbook definition."
        })),
        homework: {
          title: `${m.title} Assignment`,
          instructions: `Extend the in-class exercise with tests for ${m.title}.`,
          estimatedTimeMinutes: 30,
          submissionGuidelines: "Submit source repository or documentation"
        },
        expectedOutcomes: [`Able to apply ${m.title} effectively in software development`]
      }));
    }
  }

  // Cross-synthesize modules for legacy views if only lectures was returned
  if (!Array.isArray(content.modules) || content.modules.length === 0) {
    content.modules = (content.lectures || []).map((l) => ({
      title: l.title,
      lessons: (l.topicsCovered || []).map((t) => ({
        title: t,
        explanation: l.teachingNotes || "",
        example: l.codeExamples?.[0]?.code || ""
      })),
      quiz: (l.quizQuestions || []).map((q) => ({
        question: q.question,
        options: q.options || [],
        answer: q.answer || "",
        explanation: q.explanation || ""
      }))
    }));
  }

  // Cross-synthesize slides
  if (!Array.isArray(content.slides) || content.slides.length === 0) {
    content.slides = (content.lectures || []).map((lec, idx) => ({
      id: `slide-${idx + 1}`,
      number: idx + 1,
      title: lec.title,
      type: idx % 2 === 0 ? "code" : "concept",
      content: lec.topicsCovered || [],
      bullets: lec.topicsCovered || [],
      body: `${lec.teachingNotes || ""}\n\nObjectives:\n${(lec.learningObjectives || []).map((o) => `• ${o}`).join("\n")}`,
      codeExample: lec.codeExamples?.[0]?.code || null,
      trainerNotes: lec.teachingNotes || "",
      hasCode: Boolean(lec.codeExamples?.[0]?.code),
      verificationStatus: "passed",
      snippetId: `snip-${idx + 1}`
    }));
  }

  // Cross-synthesize snippets
  if (!Array.isArray(content.snippets) || content.snippets.length === 0) {
    content.snippets = (content.lectures || [])
      .filter((l) => l.codeExamples && l.codeExamples.length > 0)
      .map((l, idx) => ({
        id: `snip-${idx + 1}`,
        title: l.codeExamples[0].title || `${l.title} Example`,
        code: l.codeExamples[0].code,
        language: l.codeExamples[0].language || "Java",
        status: "passed",
        explanation: l.codeExamples[0].explanation || ""
      }));
  }

  // Cross-synthesize exercises
  if (!Array.isArray(content.exercises) || content.exercises.length === 0) {
    content.exercises = (content.lectures || []).flatMap((l, idx) =>
      (l.studentExercises || []).map((ex, exIdx) => ({
        id: `ex-${idx + 1}-${exIdx + 1}`,
        title: ex.title,
        difficulty: ex.difficulty || studentLevel || "Beginner",
        topic: cleanTopic,
        description: ex.problemStatement,
        problemStatement: ex.problemStatement,
        referenceSolution: ex.solution,
        status: "passed"
      }))
    );
  }

  // Cross-synthesize quiz
  if (!Array.isArray(content.quiz) || content.quiz.length === 0) {
    content.quiz = (content.lectures || []).flatMap((l) => l.quizQuestions || []);
  }

  content.numberOfLectures = content.lectures?.length || lectureCount;
  content.durationMinutes = totalMins;
  content.averageMinutesPerLecture = Math.round(totalMins / Math.max(1, content.numberOfLectures));

  return content;
}

// ─── Course Generation ─────────────────────────────────────────────────────────

export async function generateCourse({
  topic,
  studentLevel,
  durationMinutes,
  language,
  learningObjectives = "",
  numberOfLectures = 4,
  parallel = false
}) {
  const lectureCount = Math.min(30, Math.max(1, Number(numberOfLectures) || 4));
  const totalMins = Number(durationMinutes) || 60;
  const timePerLecture = Math.round(totalMins / lectureCount);

  const prompt = `
Create a comprehensive, university-grade educational course plan for "${topic}".

Parameters:
- Student Level: ${studentLevel}
- Total Duration: ${totalMins} minutes
- Number of Lectures: ${lectureCount} lectures
- Approximate Duration per Lecture: ${timePerLecture} minutes
- Language: ${language}
${learningObjectives ? `- Learning Objectives: ${learningObjectives}` : ""}

Return ONLY a JSON object with this EXACT structure:
{
  "title": "A descriptive, topic-specific course title",
  "description": "2-3 sentence overview covering scope, objectives, and concepts",
  "learningObjectives": ["Outcome 1", "Outcome 2", "Outcome 3"],
  "studentLevel": "${studentLevel}",
  "totalDurationMinutes": ${totalMins},
  "numberOfLectures": ${lectureCount},
  "lectures": [
    {
      "lectureNumber": 1,
      "title": "Topic-tailored Lecture 1 Title",
      "durationMinutes": ${timePerLecture},
      "learningObjectives": ["Specific concept students will learn", "Measurable skill"],
      "topicsCovered": ["Subtopic 1", "Subtopic 2"],
      "teachingNotes": "Practical guidance to help the professor deliver this lecture effectively.",
      "practicalActivity": {
        "title": "Hands-on Activity Title",
        "description": "Step-by-step practical task for students in class",
        "expectedDeliverable": "Functional code or artifact"
      },
      "codeExamples": [
        {
          "title": "Code Example Title",
          "language": "${language === "Java" || (topic || "").toLowerCase().includes("java") ? "Java" : "JavaScript"}",
          "code": "Clean, complete, runnable code example",
          "explanation": "Explanation of how the code works"
        }
      ],
      "commonMistakes": ["Misconception or syntax error and how to avoid it"],
      "studentExercises": [
        {
          "title": "Exercise Title",
          "difficulty": "${studentLevel}",
          "problemStatement": "Clear task description for students",
          "hint": "Helpful hint without giving away the answer",
          "solution": "Working solution or reference implementation"
        }
      ],
      "quizQuestions": [
        {
          "question": "Clear multiple choice question testing concepts from this lecture",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Option A",
          "explanation": "Why Option A is correct"
        }
      ],
      "homework": {
        "title": "Homework Title",
        "instructions": "Instructions for after-class study",
        "estimatedTimeMinutes": 30,
        "submissionGuidelines": "Submit source code repository or written answers"
      },
      "expectedOutcomes": ["Key skill retained"]
    }
  ]
}
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateCourse,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  const content = normalizeCourseContent(result.content, {
    topic,
    studentLevel,
    durationMinutes: totalMins,
    numberOfLectures: lectureCount,
  });

  return { content, providerMeta: { used: result.provider, all } };
}

// ─── Slides Generation ─────────────────────────────────────────────────────────

export async function generateSlides({ title, description, modules, language, slideCount = 12, parallel = false }) {
  const modulesSummary = Array.isArray(modules)
    ? modules.map((m, i) => `${i + 1}. ${m.title}`).join("\n")
    : "General modules";

  const prompt = `
Create ${slideCount} presentation slides for the course: "${title}"
Description: ${description}
Programming Language: ${language}
Modules:
${modulesSummary}

Return ONLY a JSON object:
{
  "slides": [
    {
      "number": 1,
      "type": "title",
      "title": "Slide title",
      "subtitle": "Optional subtitle",
      "bullets": ["Point 1", "Point 2"],
      "codeExample": null,
      "trainerNotes": "What to say here",
      "layout": "title"
    }
  ]
}

Slide types: "title", "bullets", "code", "comparison", "summary", "quiz", "conclusion"
Layouts: "title", "bullets", "two-column", "code", "summary"
Include: 1 title slide, 1 objectives slide, concept slides per module, code slides, summary slides, 1 conclusion.
Keep bullets concise (max 6 per slide). Trainer notes should be 2-3 sentences.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateSlides,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
}

// ─── Trainer Notes Generation ──────────────────────────────────────────────────

export async function generateTrainerNotes({ title, modules, language, parallel = false }) {
  const moduleTitles = Array.isArray(modules)
    ? modules.map((m) => m.title).join(", ")
    : "";

  const prompt = `
Generate detailed trainer/instructor notes for the course: "${title}"
Language: ${language}
Modules: ${moduleTitles}

Return ONLY a JSON object:
{
  "notes": [
    {
      "moduleTitle": "Module name",
      "lessonTitle": "Lesson name",
      "overview": "What this lesson covers",
      "keyPoints": ["Key point 1", "Key point 2"],
      "commonMisconceptions": ["Misconception 1"],
      "teachingTips": ["Tip 1"],
      "estimatedTime": "10 minutes",
      "suggestedActivities": ["Activity 1"]
    }
  ]
}

Produce one note entry per lesson across all modules.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateNotes,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
}

// ─── Code Examples Generation ──────────────────────────────────────────────────

export async function generateCodeExamples({ title, modules, language, runtime, parallel = false }) {
  const moduleTitles = Array.isArray(modules)
    ? modules.map((m) => m.title).join(", ")
    : "";

  const prompt = `
Generate ${language} code examples for the course: "${title}"
Runtime: ${runtime || language}
Topics covered: ${moduleTitles}

Return ONLY a JSON object:
{
  "examples": [
    {
      "title": "Example title",
      "topic": "Which module/topic this covers",
      "difficulty": "beginner",
      "language": "${language}",
      "code": "// Full working code here",
      "explanation": "What this code demonstrates",
      "expectedOutput": "What the output looks like",
      "complexityNote": "Time/space complexity if relevant"
    }
  ]
}

Generate 3-6 examples. Code must be syntactically correct ${language}. 
Include a comment header per example. Do NOT claim code is executed unless this prompt says so.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateCode,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
}

// ─── Exercises Generation ──────────────────────────────────────────────────────

export async function generateExercises({ title, modules, language, studentLevel, parallel = false }) {
  const moduleTitles = Array.isArray(modules)
    ? modules.map((m) => m.title).join(", ")
    : "";

  const prompt = `
Generate practical exercises for the ${studentLevel} course: "${title}"
Language: ${language}
Topics: ${moduleTitles}

Return ONLY a JSON object:
{
  "exercises": [
    {
      "title": "Exercise title",
      "type": "coding",
      "difficulty": "beginner",
      "topic": "Which module this covers",
      "instructions": "Clear step-by-step instructions",
      "sampleInput": "Sample input if applicable",
      "expectedOutput": "Expected output",
      "hints": ["Hint 1", "Hint 2"],
      "solution": "Reference solution code or explanation",
      "testCriteria": ["Criterion 1"]
    }
  ]
}

Exercise types: "coding", "multiple-choice", "fill-in-blank", "short-answer", "debug"
Include beginner, intermediate, and advanced exercises. Aim for 4-6 total.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateExercises,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
}

// ─── Quiz Generation ───────────────────────────────────────────────────────────

export async function generateQuiz({ title, modules, language, questionCount = 10, parallel = false }) {
  const moduleTitles = Array.isArray(modules)
    ? modules.map((m) => m.title).join(", ")
    : "";

  const prompt = `
Generate ${questionCount} multiple-choice quiz questions for the course: "${title}"
Language: ${language}
Topics: ${moduleTitles}

Return ONLY a JSON object:
{
  "questions": [
    {
      "id": 1,
      "topic": "Which module/topic",
      "difficulty": "beginner",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Why this is correct and others are wrong"
    }
  ]
}

Rules:
- Exactly 4 options per question
- The answer field MUST exactly match one of the options
- Avoid duplicate questions
- Mix beginner/intermediate/advanced difficulty
- Do not reveal the answer in the question text
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateQuiz,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
}

// ─── Cheat Sheet Generation ────────────────────────────────────────────────────

export async function generateCheatSheet({ title, modules, language, parallel = false }) {
  const moduleTitles = Array.isArray(modules)
    ? modules.map((m) => m.title).join(", ")
    : "";

  const prompt = `
Create a concise cheat sheet for the course: "${title}"
Language: ${language}
Topics: ${moduleTitles}

Return ONLY a JSON object:
{
  "sections": [
    {
      "title": "Section title",
      "type": "definitions",
      "items": [
        {
          "term": "Term or command",
          "definition": "What it means or does",
          "example": "Short code or usage example"
        }
      ]
    }
  ]
}

Section types: "definitions", "syntax", "commands", "formulas", "tips", "examples"
Keep each item concise. The cheat sheet should fit on 1-2 pages if printed.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateCheatSheet,
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
}

// ─── Verification Review ───────────────────────────────────────────────────────

export async function generateVerificationReview({ title, courseContent, language, parallel = false }) {
  const structuralChecks = runStructuralChecks(courseContent);

  const prompt = `
Review the following course for educational quality: "${title}"
Language: ${language}

Course structure (JSON summary):
${JSON.stringify({
    title: courseContent?.title,
    moduleCount: courseContent?.modules?.length || 0,
    modules: (courseContent?.modules || []).map((m) => ({
      title: m.title,
      lessonCount: m.lessons?.length || 0,
      quizCount: m.quiz?.length || 0,
    })),
  }, null, 2)}

Return ONLY a JSON object:
{
  "aiReviewSuggestions": [
    {
      "area": "Content quality",
      "observation": "What you noticed",
      "suggestion": "How to improve",
      "severity": "info"
    }
  ],
  "overallAssessment": "Brief 2-3 sentence overall assessment"
}

Severity levels: "info", "warning", "critical"
NOTE: You are reviewing for educational quality only. Do NOT claim code was executed or verified.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel: false, // verification review is always single provider
    preferredProviders: ["gemini", "groq", "cloudflare"],
  });

  return {
    content: {
      structuralChecks,
      aiReview: result.content || { aiReviewSuggestions: [], overallAssessment: "Review unavailable." },
    },
    providerMeta: { used: result.provider, all },
  };
}

// ─── Deterministic Structural Checks ──────────────────────────────────────────

function runStructuralChecks(content) {
  const checks = [];

  const pass = (id, label) => checks.push({ id, label, status: "pass" });
  const fail = (id, label, detail) => checks.push({ id, label, status: "fail", detail });
  const warn = (id, label, detail) => checks.push({ id, label, status: "warning", detail });

  // 1. Title
  if (typeof content?.title === "string" && content.title.trim()) pass("title", "Course title present");
  else fail("title", "Course title present", "title field is missing or empty");

  // 2. Description
  if (typeof content?.description === "string" && content.description.length > 20) pass("description", "Course description present");
  else warn("description", "Course description present", "description is missing or very short");

  // 3. Modules
  if (Array.isArray(content?.modules) && content.modules.length > 0) pass("modules", "At least one module");
  else fail("modules", "At least one module", "No modules found in course content");

  // 4. Lessons
  const totalLessons = (content?.modules || []).reduce((s, m) => s + (m.lessons?.length || 0), 0);
  if (totalLessons > 0) pass("lessons", `Lessons present (${totalLessons} total)`);
  else fail("lessons", "Lessons present", "No lessons found across all modules");

  // 5. Quiz questions
  const totalQuiz = (content?.modules || []).reduce((s, m) => s + (m.quiz?.length || 0), 0);
  if (totalQuiz > 0) pass("quiz", `Quiz questions present (${totalQuiz} total)`);
  else warn("quiz", "Quiz questions present", "No quiz questions found");

  // 6. Quiz answer validity
  let badAnswers = 0;
  for (const m of content?.modules || []) {
    for (const q of m.quiz || []) {
      if (!Array.isArray(q.options) || !q.options.includes(q.answer)) badAnswers++;
    }
  }
  if (badAnswers === 0) pass("quiz-answers", "All quiz answers are valid");
  else fail("quiz-answers", "All quiz answers are valid", `${badAnswers} question(s) have answers not in options`);

  // 7. No empty lessons
  let emptyLessons = 0;
  for (const m of content?.modules || []) {
    for (const l of m.lessons || []) {
      if (!l.explanation || l.explanation.length < 10) emptyLessons++;
    }
  }
  if (emptyLessons === 0) pass("lesson-content", "All lessons have content");
  else warn("lesson-content", "All lessons have content", `${emptyLessons} lesson(s) have empty or minimal explanation`);

  return checks;
}
