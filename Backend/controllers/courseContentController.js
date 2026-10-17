import { supabase } from "../config/supabase.js";

function getContent(course) {
  if (!course?.content || typeof course.content !== "object") {
    return null;
  }

  return course.content;
}

async function findOwnedCourse(courseId, userId) {
  let query = supabase
    .from("courses")
    .select("id, title, content")
    .eq("id", courseId);

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      return { course: null };
    }

    throw error;
  }

  return { course: data };
}

function parseIndex(value) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export async function getLessons(req, res) {
  try {
    const { course, error } = await findOwnedCourse(
      req.params.courseId,
      req.user.id
    );

    if (error) {
      throw error;
    }

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const content = getContent(course);
    if (!content || !Array.isArray(content.modules)) {
      return res.status(404).json({ error: "Course lessons are unavailable" });
    }

    return res.json({
      course: { id: course.id, title: course.title },
      modules: content.modules.map((module, moduleIndex) => ({
        index: moduleIndex,
        title: module.title,
        lessons: Array.isArray(module.lessons) ? module.lessons : []
      }))
    });
  } catch (error) {
    console.error("Fetch course lessons error:", error.message);
    return res.status(500).json({ error: "Could not fetch course lessons" });
  }
}

export async function getQuiz(req, res) {
  try {
    const { course, error } = await findOwnedCourse(
      req.params.courseId,
      req.user.id
    );

    if (error) {
      throw error;
    }

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const content = getContent(course);
    if (!content || !Array.isArray(content.modules)) {
      return res.status(404).json({ error: "Course quiz is unavailable" });
    }

    return res.json({
      course: { id: course.id, title: course.title },
      modules: content.modules.map((module, moduleIndex) => ({
        index: moduleIndex,
        title: module.title,
        questions: Array.isArray(module.quiz)
          ? module.quiz.map((question, questionIndex) => ({
              index: questionIndex,
              question: question.question,
              options: question.options
            }))
          : []
      }))
    });
  } catch (error) {
    console.error("Fetch course quiz error:", error.message);
    return res.status(500).json({ error: "Could not fetch course quiz" });
  }
}

export async function evaluateQuiz(req, res) {
  try {
    const { course, error } = await findOwnedCourse(
      req.params.courseId,
      req.user.id
    );

    if (error) {
      throw error;
    }

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (!Array.isArray(req.body.answers)) {
      return res.status(400).json({
        error: "Answers must be an array of moduleIndex, questionIndex, and answer"
      });
    }

    const content = getContent(course);
    if (!content || !Array.isArray(content.modules)) {
      return res.status(404).json({ error: "Course quiz is unavailable" });
    }

    const questions = [];
    for (let moduleIndex = 0; moduleIndex < content.modules.length; moduleIndex += 1) {
      const module = content.modules[moduleIndex];
      if (!Array.isArray(module.quiz)) {
        continue;
      }

      for (let questionIndex = 0; questionIndex < module.quiz.length; questionIndex += 1) {
        questions.push({
          moduleIndex,
          questionIndex,
          question: module.quiz[questionIndex]
        });
      }
    }

    const submittedAnswers = new Map();
    for (const submitted of req.body.answers) {
      if (
        !submitted ||
        !Number.isInteger(submitted.moduleIndex) ||
        !Number.isInteger(submitted.questionIndex) ||
        typeof submitted.answer !== "string"
      ) {
        return res.status(400).json({
          error: "Each answer must include integer moduleIndex, questionIndex, and a string answer"
        });
      }

      submittedAnswers.set(
        `${submitted.moduleIndex}:${submitted.questionIndex}`,
        submitted.answer
      );
    }

    const results = questions.map(({ moduleIndex, questionIndex, question }) => {
      const submittedAnswer = submittedAnswers.get(`${moduleIndex}:${questionIndex}`) ?? null;
      const correct = submittedAnswer === question.answer;

      return {
        moduleIndex,
        questionIndex,
        question: question.question,
        submittedAnswer,
        correct,
        correctAnswer: question.answer,
        explanation: question.explanation
      };
    });

    const score = results.filter(result => result.correct).length;
    const total = results.length;

    return res.json({
      course: { id: course.id, title: course.title },
      score,
      total,
      percentage: total ? Math.round((score / total) * 100) : 0,
      results
    });
  } catch (error) {
    console.error("Evaluate course quiz error:", error.message);
    return res.status(500).json({ error: "Could not evaluate course quiz" });
  }
}
