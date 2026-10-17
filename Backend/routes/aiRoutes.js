/**
 * AI Routes
 * All AI generation endpoints — supports both authenticated and guest users.
 * Guest users can generate; auth is required only for saving to Supabase.
 */

import express from "express";
import { getSupabase } from "../config/supabase.js";
import { requireAuth, getDevUser } from "../middleware/auth.js";
import {
  generateCourse,
  generateSlides,
  generateTrainerNotes,
  generateCodeExamples,
  generateExercises,
  generateQuiz,
  generateCheatSheet,
  generateVerificationReview,
} from "../Services/featureGenerators.js";
import { getConfiguredProviders } from "../Services/aiOrchestrator.js";

const router = express.Router();

// ─── Helper: validate request body fields ─────────────────────────────────────

function requireString(val, name, maxLen = 500) {
  if (typeof val !== "string" || !val.trim()) throw new Error(`${name} is required`);
  if (val.length > maxLen) throw new Error(`${name} must be at most ${maxLen} characters`);
  return val.trim();
}

// ─── GET /api/ai/providers — show which providers are configured ───────────────

router.get("/providers", (req, res) => {
  const configured = getConfiguredProviders();
  res.json({
    configured,
    count: configured.length,
    parallelAvailable: configured.length > 1,
  });
});

// ─── POST /api/ai/generate-course ─────────────────────────────────────────────

router.post("/generate-course", async (req, res) => {
  try {
    const {
      topic,
      student_level = "Beginner",
      duration_minutes = 60,
      language = "English",
      learning_objectives = "",
      number_of_lectures,
      numberOfLectures,
      parallel = false,
    } = req.body;

    requireString(topic, "topic", 300);

    const allowedLevels = ["Beginner", "Intermediate", "Advanced"];
    if (!allowedLevels.includes(student_level)) {
      return res.status(400).json({ error: "Level must be Beginner, Intermediate, or Advanced" });
    }
    if (!Number.isInteger(duration_minutes) || duration_minutes < 15 || duration_minutes > 600) {
      return res.status(400).json({ error: "Duration must be between 15 and 600 minutes" });
    }

    const lectureCount = Number(number_of_lectures || numberOfLectures) || 4;

    const { content, providerMeta } = await generateCourse({
      topic: topic.trim(),
      studentLevel: student_level,
      durationMinutes: duration_minutes,
      language: language.trim(),
      learningObjectives: learning_objectives,
      numberOfLectures: lectureCount,
      parallel: !!parallel,
    });

    // Save to Supabase (authenticated user or dev user)
    let savedCourse = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabase = getSupabase();
        const token = authHeader.slice(7).trim();
        let userId = null;
        if (token === "dev-token" || token.startsWith("mock-") || token === "guest-token") {
          const devUser = await getDevUser();
          userId = devUser?.id;
        } else {
          const { data: userData } = await supabase.auth.getUser(token);
          userId = userData?.user?.id;
        }

        if (userId) {
          const { data, error } = await supabase
            .from("courses")
            .insert({
              user_id: userId,
              title: content.title || topic.trim(),
              topic: topic.trim(),
              student_level,
              duration_minutes,
              language: language.trim(),
              content,
            })
            .select()
            .single();

          if (!error) savedCourse = data;
          else console.warn("Save course failed (non-blocking):", error.message);
        }
      } catch (saveErr) {
        console.warn("Could not save to DB (non-blocking):", saveErr.message);
      }
    }

    return res.status(201).json({
      message: "Course generated successfully",
      content,
      savedCourse,
      course: savedCourse,
      providerMeta: {
        used: providerMeta.used,
        all: providerMeta.all.map((r) => ({
          provider: r.provider,
          status: r.status,
          durationMs: r.durationMs,
          error: r.error,
        })),
      },
    });
  } catch (err) {
    console.error("generate-course error:", err.message);
    return res.status(500).json({ error: err.message || "Course generation failed" });
  }
});

// ─── POST /api/ai/generate-slides ─────────────────────────────────────────────

router.post("/generate-slides", async (req, res) => {
  try {
    const { title, description, modules, language, slide_count = 12, parallel = false } = req.body;
    requireString(title, "title", 300);

    const { content, providerMeta } = await generateSlides({
      title,
      description: description || "",
      modules: Array.isArray(modules) ? modules : [],
      language: language || "English",
      slideCount: Math.min(Math.max(parseInt(slide_count) || 12, 5), 30),
      parallel: !!parallel,
    });

    // Optionally save slides to DB if authenticated
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ") && req.body.course_id) {
      try {
        const supabase = getSupabase();
        const token = authHeader.slice(7);
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) {
          await supabase
            .from("courses")
            .update({ slides: content.slides })
            .eq("id", req.body.course_id)
            .eq("user_id", userData.user.id);
        }
      } catch (e) {
        console.warn("Could not save slides (non-blocking):", e.message);
      }
    }

    return res.json({
      message: "Slides generated",
      slides: content.slides,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-slides error:", err.message);
    return res.status(500).json({ error: err.message || "Slide generation failed" });
  }
});

// ─── POST /api/ai/generate-notes ──────────────────────────────────────────────

router.post("/generate-notes", async (req, res) => {
  try {
    const { title, modules, language, parallel = false } = req.body;
    requireString(title, "title", 300);

    const { content, providerMeta } = await generateTrainerNotes({
      title,
      modules: Array.isArray(modules) ? modules : [],
      language: language || "English",
      parallel: !!parallel,
    });

    return res.json({
      message: "Trainer notes generated",
      notes: content.notes,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-notes error:", err.message);
    return res.status(500).json({ error: err.message || "Notes generation failed" });
  }
});

// ─── POST /api/ai/generate-code ───────────────────────────────────────────────

router.post("/generate-code", async (req, res) => {
  try {
    const { title, modules, language, runtime, parallel = false } = req.body;
    requireString(title, "title", 300);
    requireString(language, "language", 50);

    const { content, providerMeta } = await generateCodeExamples({
      title,
      modules: Array.isArray(modules) ? modules : [],
      language,
      runtime: runtime || language,
      parallel: !!parallel,
    });

    return res.json({
      message: "Code examples generated",
      examples: content.examples,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-code error:", err.message);
    return res.status(500).json({ error: err.message || "Code generation failed" });
  }
});

// ─── POST /api/ai/generate-exercises ──────────────────────────────────────────

router.post("/generate-exercises", async (req, res) => {
  try {
    const { title, modules, language, student_level = "Beginner", parallel = false } = req.body;
    requireString(title, "title", 300);

    const { content, providerMeta } = await generateExercises({
      title,
      modules: Array.isArray(modules) ? modules : [],
      language: language || "English",
      studentLevel: student_level,
      parallel: !!parallel,
    });

    return res.json({
      message: "Exercises generated",
      exercises: content.exercises,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-exercises error:", err.message);
    return res.status(500).json({ error: err.message || "Exercise generation failed" });
  }
});

// ─── POST /api/ai/generate-quiz ───────────────────────────────────────────────

router.post("/generate-quiz", async (req, res) => {
  try {
    const { title, modules, language, question_count = 10, parallel = false } = req.body;
    requireString(title, "title", 300);

    const { content, providerMeta } = await generateQuiz({
      title,
      modules: Array.isArray(modules) ? modules : [],
      language: language || "English",
      questionCount: Math.min(Math.max(parseInt(question_count) || 10, 3), 30),
      parallel: !!parallel,
    });

    return res.json({
      message: "Quiz generated",
      questions: content.questions,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-quiz error:", err.message);
    return res.status(500).json({ error: err.message || "Quiz generation failed" });
  }
});

// ─── POST /api/ai/generate-cheatsheet ─────────────────────────────────────────

router.post("/generate-cheatsheet", async (req, res) => {
  try {
    const { title, modules, language, parallel = false } = req.body;
    requireString(title, "title", 300);

    const { content, providerMeta } = await generateCheatSheet({
      title,
      modules: Array.isArray(modules) ? modules : [],
      language: language || "English",
      parallel: !!parallel,
    });

    return res.json({
      message: "Cheat sheet generated",
      sections: content.sections,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-cheatsheet error:", err.message);
    return res.status(500).json({ error: err.message || "Cheat sheet generation failed" });
  }
});

// ─── POST /api/ai/generate-verification ───────────────────────────────────────

router.post("/generate-verification", async (req, res) => {
  try {
    const { title, course_content, language } = req.body;
    requireString(title, "title", 300);

    const { content, providerMeta } = await generateVerificationReview({
      title,
      courseContent: course_content || {},
      language: language || "English",
    });

    return res.json({
      message: "Verification complete",
      structuralChecks: content.structuralChecks,
      aiReview: content.aiReview,
      providerMeta: { used: providerMeta.used },
    });
  } catch (err) {
    console.error("generate-verification error:", err.message);
    return res.status(500).json({ error: err.message || "Verification failed" });
  }
});

// ─── GET /api/courses/:id — Load saved course (requires auth) ─────────────────

router.get("/course/:id", requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "Could not load course" });
    if (!data) return res.status(404).json({ error: "Course not found" });

    return res.json({ course: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Returns a short, safe error reason suitable for display in the UI.
 * Never leaks raw SQL, table names, or keys.
 */
function sanitizeErrorMessage(error) {
  const code = error.code || "";
  const msg  = (error.message || "").toLowerCase();

  if (code === "23503") {
    return "user account not found in the database (foreign-key violation — run the SQL migration)";
  }
  if (code === "42P01") {
    return "the 'courses' table does not exist yet — run the SQL migration in Supabase";
  }
  if (code === "42501" || msg.includes("row-level security") || msg.includes("policy")) {
    return "permission denied by row-level security — check RLS policies in Supabase";
  }
  if (code === "PGRST204" || msg.includes("could not find the") || msg.includes("column")) {
    return "table schema mismatch — a required column is missing, run the SQL migration";
  }
  if (code === "22P02") {
    return "data type mismatch (e.g. user_id format is wrong)";
  }
  if (msg.includes("jwt") || msg.includes("token") || code === "PGRST301") {
    return "authentication token rejected by Supabase";
  }
  return `database error (code: ${code || "unknown"})`;
}

export default router;
