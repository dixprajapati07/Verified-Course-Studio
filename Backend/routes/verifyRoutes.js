import express from "express";
import { verifySnippet, verifyExercise } from "../Services/verifier.js";
import { runJava } from "../Services/javaRunner.js";

const router = express.Router();

// POST /api/verify/snippet
// Verifies a Java code snippet by compiling and running it with Java 21
router.post("/snippet", async (req, res) => {
  try {
    const { code, expectedOutput, title, slideId, id } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Java code string is required" });
    }

    const result = await verifySnippet({
      id,
      title,
      slideId,
      code,
      expectedOutput
    });

    return res.json(result);
  } catch (error) {
    console.error("Verification snippet error:", error);
    return res.status(500).json({
      error: "Verification failed due to internal error",
      details: error.message
    });
  }
});

// POST /api/verify/exercise
// Verifies an exercise (reference solution and naive solution)
router.post("/exercise", async (req, res) => {
  try {
    const { referenceSolution, naiveSolution, testHarness, testCases, title, id, naiveShouldFail } = req.body;
    if (!referenceSolution) {
      return res.status(400).json({ error: "referenceSolution is required" });
    }

    const result = await verifyExercise({
      id,
      title,
      referenceSolution,
      naiveSolution,
      testHarness,
      testCases,
      naiveShouldFail
    });

    return res.json(result);
  } catch (error) {
    console.error("Verification exercise error:", error);
    return res.status(500).json({
      error: "Exercise verification failed due to internal error",
      details: error.message
    });
  }
});

// POST /api/verify/run
// Runs raw Java code with timeout and compilation reporting
router.post("/run", async (req, res) => {
  try {
    const { code, files, timeoutMs, mode } = req.body;
    const inputFiles = files || code;
    if (!inputFiles) {
      return res.status(400).json({ error: "code or files required" });
    }

    const result = await runJava(inputFiles, { timeoutMs, mode });
    return res.json(result);
  } catch (error) {
    console.error("Raw Java run error:", error);
    return res.status(500).json({
      error: "Execution failed due to internal error",
      details: error.message
    });
  }
});

export default router;
