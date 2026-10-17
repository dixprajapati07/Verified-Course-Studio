/**
 * Feature Generation Functions
 * Each function builds a prompt, calls the orchestrator, validates the result, and returns structured data.
 */

import { generate } from "./aiOrchestrator.js";

// ─── Schema Validators ─────────────────────────────────────────────────────────

function validateCourse(content) {
  if (typeof content.title !== "string" || !content.title) throw new Error("Missing title");
  if (typeof content.description !== "string" || !content.description) throw new Error("Missing description");
  if (!Array.isArray(content.modules) || content.modules.length === 0) throw new Error("No modules");
  for (const mod of content.modules) {
    if (typeof mod.title !== "string") throw new Error("Module missing title");
    if (!Array.isArray(mod.lessons)) throw new Error("Module missing lessons");
    if (!Array.isArray(mod.quiz)) throw new Error("Module missing quiz");
    for (const q of mod.quiz) {
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error("Quiz question needs options");
      if (typeof q.answer !== "string") throw new Error("Quiz question missing answer");
    }
  }
}

function validateSlides(content) {
  if (!Array.isArray(content.slides) || content.slides.length === 0) throw new Error("No slides");
  for (const s of content.slides) {
    if (typeof s.title !== "string" || !s.title) throw new Error("Slide missing title");
    if (typeof s.type !== "string") throw new Error("Slide missing type");
  }
}

function validateNotes(content) {
  if (!Array.isArray(content.notes) || content.notes.length === 0) throw new Error("No notes");
}

function validateCode(content) {
  if (!Array.isArray(content.examples) || content.examples.length === 0) throw new Error("No code examples");
  for (const ex of content.examples) {
    if (typeof ex.title !== "string") throw new Error("Code example missing title");
    if (typeof ex.code !== "string") throw new Error("Code example missing code");
  }
}

function validateExercises(content) {
  if (!Array.isArray(content.exercises) || content.exercises.length === 0) throw new Error("No exercises");
}

function validateQuiz(content) {
  if (!Array.isArray(content.questions) || content.questions.length === 0) throw new Error("No quiz questions");
  for (const q of content.questions) {
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error("Question needs options");
    if (typeof q.answer !== "string") throw new Error("Question missing answer");
    if (!q.options.includes(q.answer)) throw new Error("Answer not in options");
  }
}

function validateCheatSheet(content) {
  if (!Array.isArray(content.sections) || content.sections.length === 0) throw new Error("No sections");
}

// ─── Course Generation ─────────────────────────────────────────────────────────

export async function generateCourse({ topic, studentLevel, durationMinutes, language, learningObjectives = '', parallel = false }) {
  const prompt = `
Create a complete educational course for "${topic}".

Student level: ${studentLevel}
Duration: ${durationMinutes} minutes
Language: ${language}
Specific learning objectives: ${learningObjectives || 'Choose practical objectives appropriate for the topic and level.'}

Return ONLY a JSON object with this structure:
{
  "title": "Course title",
  "description": "2-3 sentence course overview",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "prerequisites": ["prerequisite 1"],
  "difficulty": "${studentLevel}",
  "estimatedDuration": ${durationMinutes},
  "modules": [
    {
      "title": "Module title",
      "lessons": [
        {
          "title": "Lesson title",
          "explanation": "Detailed explanation",
          "example": "Practical example"
        }
      ],
      "quiz": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Option A",
          "explanation": "Why this is correct"
        }
      ]
    }
  ]
}

Adjust content depth and number of modules to fit the ${durationMinutes}-minute duration.
`.trim();

  const { result, all } = await generate(prompt, {
    parallel,
    validate: validateCourse,
    preferredProviders: ["groq", "cloudflare", "gemini"],
  });

  return { content: result.content, providerMeta: { used: result.provider, all } };
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
    preferredProviders: ["groq", "cloudflare", "gemini"],
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
