import express from "express";
import { supabase, isLocalMode } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

/** Log the full Supabase error object — never logs secrets. */
function logDbError(label, error) {
  console.error(
    `\n❌ [courseRoutes] ${label}:\n` +
    `   message : ${error.message}\n` +
    `   code    : ${error.code}\n` +
    `   details : ${error.details}\n` +
    `   hint    : ${error.hint}\n`
  );
}
import {
  evaluateQuiz,
  getLessons,
  getQuiz
} from "../controllers/courseContentController.js";
import { verifySnippet } from "../Services/verifier.js";
import { regenerateSlideContent, generateCourse, regenerateLectureContent } from "../Services/aiServices.js";

const router = express.Router();

function formatCourseForListing(course) {
  const content = course.content || {};
  const vSummary = content.verificationSummary || null;
  const lectures = Array.isArray(content.lectures) ? content.lectures : [];

  return {
    ...course,
    level: course.student_level || "Beginner",
    duration: `${course.duration_minutes || 60} minutes`,
    runtimeVersion: content.runtimeVersion || "Java 21 / Sandbox",
    numberOfLectures: content.numberOfLectures || lectures.length || 4,
    lecturesCount: lectures.length,
    averageMinutesPerLecture: content.averageMinutesPerLecture || Math.round((course.duration_minutes || 60) / (lectures.length || 4)),
    slidesCount: Array.isArray(content.slides) ? content.slides.length : 0,
    exercisesCount: Array.isArray(content.exercises) ? content.exercises.length : 0,
    codeExamplesCount: Array.isArray(content.snippets) ? content.snippets.length : 0,
    quizCount: Array.isArray(content.quiz) ? content.quiz.length : 0,
    verificationStatus: content.verificationStatus || (vSummary ? (vSummary.failed > 0 ? "partial" : "verified") : "pending"),
    verificationSummary: vSummary,
    verifiedCount: vSummary?.passed ?? 0,
    totalCount: vSummary?.total ?? 0
  };
}

function recalculateVerificationSummary(courseContent) {
  const snippets = Array.isArray(courseContent.snippets) ? courseContent.snippets : [];
  const exercises = Array.isArray(courseContent.exercises) ? courseContent.exercises : [];
  const allItems = [...snippets, ...exercises];

  const total = allItems.length;
  const passed = allItems.filter((i) => i.status === "passed").length;
  const failed = allItems.filter((i) => i.status === "failed").length;
  const pending = allItems.filter((i) => i.status === "pending").length;

  courseContent.verificationSummary = {
    total,
    passed,
    failed,
    pending,
    environment: courseContent.verificationSummary?.environment || "Java 21 (OpenJDK 21)",
    verifiedAt: new Date().toISOString()
  };

  courseContent.verificationStatus = failed === 0 && passed > 0
    ? "verified"
    : passed > 0
    ? "partial"
    : failed > 0
    ? "failed"
    : "pending";
}

// POST /api/courses
// Create a course for the authenticated user
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      topic,
      student_level,
      duration_minutes,
      language,
      content
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof topic !== "string" ||
      !topic.trim()
    ) {
      return res.status(400).json({
        error: "Title and topic are required"
      });
    }

    if (
      duration_minutes !== undefined &&
      duration_minutes !== null &&
      (!Number.isInteger(duration_minutes) || duration_minutes <= 0)
    ) {
      return res.status(400).json({
        error: "Duration must be a positive integer"
      });
    }

    if (
      content !== undefined &&
      (content === null ||
        typeof content !== "object" ||
        Array.isArray(content))
    ) {
      return res.status(400).json({
        error: "Content must be a JSON object"
      });
    }

    if (isLocalMode) {
      console.warn("⚠️  [courseRoutes] Saving to LOCAL file store (not Supabase).");
    }

    const insertPayload = {
      user_id: req.user.id,
      title: title.trim(),
      topic: topic.trim(),
      student_level: student_level ?? "Beginner",
      duration_minutes: duration_minutes ?? 60,
      language: language ?? "English",
      content: content ?? {}
    };

    let { data, error } = await supabase
      .from("courses")
      .insert(insertPayload)
      .select()
      .single();

    if (error && error.code === "23503") {
      console.warn(
        `\n⚠️  [courseRoutes] Foreign-key violation on user_id (${insertPayload.user_id}).\n` +
        "   Retrying insert with user_id: null so course is preserved...\n"
      );
      const retryResult = await supabase
        .from("courses")
        .insert({ ...insertPayload, user_id: null })
        .select()
        .single();

      if (!retryResult.error) {
        data = retryResult.data;
        error = null;
      }
    }

    if (error) {
      logDbError("Create course insert failed", error);
      return res.status(500).json({
        error: "Could not save course to database",
        draft: { title: title.trim(), topic: topic.trim(), content: content ?? {} }
      });
    }

    return res.status(201).json({
      message: "Course created successfully",
      course: formatCourseForListing(data),
      storage: isLocalMode ? "local" : "supabase"
    });
  } catch (error) {
    console.error("Create course exception:", error.message, error.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/courses
// Get courses owned by user or created in dev mode
router.get("/", requireAuth, async (req, res) => {
  try {
    let query = supabase.from("courses").select("*");
    if (req.user?.id) {
      query = query.or(`user_id.eq.${req.user.id},user_id.is.null`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      logDbError("Fetch courses failed", error);
      return res.status(500).json({ error: "Could not fetch courses" });
    }

    const formatted = data.map(formatCourseForListing);

    return res.status(200).json({
      count: formatted.length,
      courses: formatted
    });
  } catch (error) {
    console.error("Fetch courses exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/courses/:id
// Get a single course owned by user
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", req.params.id)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Course not found" });
    }

    return res.json({ course: formatCourseForListing(data) });
  } catch (error) {
    console.error("Fetch single course exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/courses/:id
// Delete a course owned by user
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", req.params.id)
      .or(`user_id.eq.${req.user.id},user_id.is.null`);

    if (error) {
      return res.status(500).json({ error: "Could not delete course" });
    }

    return res.json({ message: "Course deleted successfully", id: req.params.id });
  } catch (error) {
    console.error("Delete course exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/courses/:id
// Update course content or metadata
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { title, topic, content } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (topic !== undefined) updates.topic = topic;
    if (content !== undefined) updates.content = content;

    const { data, error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", req.params.id)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Course not found or could not update" });
    }

    return res.json({ course: formatCourseForListing(data) });
  } catch (error) {
    console.error("Update course exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/courses/:courseId/snippets/:snippetId/reverify
// Re-verifies a snippet using real Java 21 compilation and execution
router.post("/:courseId/snippets/:snippetId/reverify", requireAuth, async (req, res) => {
  try {
    const { courseId, snippetId } = req.params;

    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const content = course.content || {};
    const snippets = content.snippets || [];
    const snippetIndex = snippets.findIndex((s) => s.id === snippetId);

    if (snippetIndex === -1) {
      return res.status(404).json({ error: "Snippet not found in course" });
    }

    const snippet = snippets[snippetIndex];
    // Allow overriding snippet code in req.body for test injection or slide edits
    if (req.body.code) {
      snippet.code = req.body.code;
    }

    console.log(`▶ Re-verifying snippet ${snippetId} ("${snippet.title}")...`);
    const verification = await verifySnippet(snippet);

    // Update snippet with real execution results
    snippets[snippetIndex] = {
      ...snippet,
      status: verification.status,
      compiled: verification.compiled,
      exitCode: verification.exitCode,
      stdout: verification.stdout,
      stderr: verification.stderr,
      error: verification.error,
      command: verification.command,
      executionDurationMs: verification.executionDurationMs,
      verifiedAt: verification.verifiedAt,
      verificationHistory: [
        ...(snippet.verificationHistory || []),
        {
          at: verification.verifiedAt,
          status: verification.status,
          durationMs: verification.executionDurationMs,
          error: verification.error
        }
      ]
    };

    // Update corresponding slide if present
    if (snippet.slideId && Array.isArray(content.slides)) {
      const slide = content.slides.find((s) => s.id === snippet.slideId);
      if (slide) {
        slide.verificationStatus = verification.status;
        if (req.body.code) {
          slide.codeExample = req.body.code;
        }
      }
    }

    // Recompute course verification summary
    recalculateVerificationSummary(content);

    // Persist updated course
    const { data: updatedCourse, error: saveErr } = await supabase
      .from("courses")
      .update({ content })
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .select()
      .single();

    if (saveErr) {
      logDbError("Persist reverified snippet failed", saveErr);
      return res.status(500).json({ error: "Failed to persist updated verification" });
    }

    return res.json({
      message: "Snippet re-verified successfully",
      snippet: snippets[snippetIndex],
      verificationSummary: content.verificationSummary,
      course: formatCourseForListing(updatedCourse)
    });
  } catch (error) {
    console.error("Re-verify snippet exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/courses/:courseId/slides/:slideIndex/regenerate
// Regenerates single slide without mutating other slides
router.post("/:courseId/slides/:slideIndex/regenerate", requireAuth, async (req, res) => {
  try {
    const { courseId, slideIndex } = req.params;
    const index = parseInt(slideIndex, 10);

    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const content = course.content || {};
    const slides = content.slides || [];

    if (!Number.isInteger(index) || index < 0 || index >= slides.length) {
      return res.status(400).json({ error: `Invalid slideIndex ${slideIndex}. Course has ${slides.length} slides.` });
    }

    const currentSlide = slides[index];
    const { slide: updatedSlide, snippet: updatedSnippet } = await regenerateSlideContent({
      topic: course.topic,
      slideIndex: index + 1,
      currentSlide
    });

    // Update only this slide
    slides[index] = updatedSlide;

    // Update snippet if this slide has code
    if (updatedSnippet && Array.isArray(content.snippets)) {
      const snipIdx = content.snippets.findIndex((s) => s.slideId === updatedSlide.id || s.id === updatedSlide.snippetId);
      if (snipIdx !== -1) {
        content.snippets[snipIdx] = updatedSnippet;
      } else {
        content.snippets.push(updatedSnippet);
      }
    }

    // Recompute summary
    recalculateVerificationSummary(content);

    // Save to DB
    const { data: updatedCourse, error: saveErr } = await supabase
      .from("courses")
      .update({ content })
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .select()
      .single();

    if (saveErr) {
      logDbError("Persist regenerated slide failed", saveErr);
      return res.status(500).json({ error: "Failed to persist regenerated slide" });
    }

    return res.json({
      message: "Slide regenerated successfully",
      slideIndex: index,
      slide: updatedSlide,
      snippet: updatedSnippet,
      verificationSummary: content.verificationSummary,
      course: formatCourseForListing(updatedCourse)
    });
  } catch (error) {
    console.error("Regenerate slide exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/courses/:courseId/regenerate
// Regenerates full course and re-verifies all code
router.post("/:courseId/regenerate", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const generated = await generateCourse({
      topic: course.topic,
      studentLevel: course.student_level,
      durationMinutes: course.duration_minutes,
      language: course.language
    });

    const { data: updatedCourse, error: saveErr } = await supabase
      .from("courses")
      .update({
        title: generated.title,
        content: generated
      })
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .select()
      .single();

    if (saveErr) {
      logDbError("Persist regenerated course failed", saveErr);
      return res.status(500).json({ error: "Failed to persist regenerated course" });
    }

    return res.json({
      message: "Course regenerated and verified successfully",
      course: formatCourseForListing(updatedCourse)
    });
  } catch (error) {
    console.error("Regenerate course exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/courses/generate
// Dynamic course generator endpoint (convenience alias requested by specification)
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const topic = req.body.topic;
    const student_level = req.body.student_level || req.body.studentLevel || "Beginner";
    const duration_minutes = Number(req.body.duration_minutes || req.body.durationMinutes) || 60;
    const number_of_lectures = Number(req.body.number_of_lectures || req.body.numberOfLectures) || 4;
    const learning_objectives = (req.body.learning_objectives || req.body.learningObjectives || "").trim();
    const language = req.body.language || "English";

    if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 2000) {
      return res.status(400).json({ error: "Topic is required and must be at most 2000 characters" });
    }

    const generated = await generateCourse({
      topic: topic.trim(),
      studentLevel: student_level,
      durationMinutes: duration_minutes,
      numberOfLectures: number_of_lectures,
      learningObjectives: learning_objectives,
      language
    });

    const insertPayload = {
      user_id: req.user.id,
      title: generated.title,
      topic: topic.trim(),
      student_level,
      duration_minutes,
      language,
      content: generated
    };

    let { data, error } = await supabase
      .from("courses")
      .insert(insertPayload)
      .select()
      .single();

    if (error && error.code === "23503") {
      const retryResult = await supabase
        .from("courses")
        .insert({ ...insertPayload, user_id: null })
        .select()
        .single();
      if (!retryResult.error) {
        data = retryResult.data;
        error = null;
      }
    }

    if (error) {
      logDbError("Create generated course failed", error);
      return res.status(500).json({
        error: "Could not save generated course",
        draft: generated
      });
    }

    return res.status(201).json({
      message: "Course generated successfully",
      course: formatCourseForListing(data)
    });
  } catch (err) {
    console.error("Course generate exception:", err.message);
    return res.status(500).json({ error: "Course generation failed" });
  }
});

// POST /api/courses/:courseId/lectures/:lectureNumber/regenerate
// Regenerates an individual lecture without changing the rest of the course
router.post("/:courseId/lectures/:lectureNumber/regenerate", requireAuth, async (req, res) => {
  try {
    const { courseId, lectureNumber } = req.params;
    const lecNum = parseInt(lectureNumber, 10);

    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .single();

    if (error || !course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const content = course.content || {};
    const lectures = Array.isArray(content.lectures) ? content.lectures : [];

    if (!Number.isInteger(lecNum) || lecNum < 1 || lecNum > Math.max(30, lectures.length)) {
      return res.status(400).json({ error: `Invalid lectureNumber ${lectureNumber}. Course has ${lectures.length} lectures.` });
    }

    const currentLecture = lectures.find((l) => l.lectureNumber === lecNum) || lectures[lecNum - 1] || {};
    const lectureDuration = currentLecture.durationMinutes || Math.round((course.duration_minutes || 60) / (lectures.length || 4));

    const updatedLecture = await regenerateLectureContent({
      topic: course.topic,
      studentLevel: course.student_level,
      lectureNumber: lecNum,
      totalLectures: lectures.length || 4,
      lectureDuration,
      currentLecture
    });

    // Update the lecture in content.lectures
    const existingIdx = lectures.findIndex((l) => l.lectureNumber === lecNum);
    if (existingIdx !== -1) {
      lectures[existingIdx] = updatedLecture;
    } else {
      lectures.push(updatedLecture);
    }

    content.lectures = lectures;

    const { data: updatedCourse, error: saveErr } = await supabase
      .from("courses")
      .update({ content })
      .eq("id", courseId)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .select()
      .single();

    if (saveErr) {
      logDbError("Persist regenerated lecture failed", saveErr);
      return res.status(500).json({ error: "Failed to persist regenerated lecture" });
    }

    return res.json({
      message: `Lecture ${lecNum} regenerated successfully`,
      lecture: updatedLecture,
      course: formatCourseForListing(updatedCourse)
    });
  } catch (error) {
    console.error("Regenerate lecture exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/courses/:id
router.get("/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const { id } = req.params;
    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Fetch course by id error:", error.message);
      return res.status(500).json({ error: "Could not fetch course" });
    }

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    return res.json({ course });
  } catch (error) {
    console.error("Fetch course by id exception:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/courses/:courseId/lessons
router.get("/:courseId/lessons", requireAuth, getLessons);

// GET /api/courses/:courseId/quiz
router.get("/:courseId/quiz", requireAuth, getQuiz);

// POST /api/courses/:courseId/quiz/evaluate
router.post("/:courseId/quiz/evaluate", requireAuth, evaluateQuiz);

export default router;

