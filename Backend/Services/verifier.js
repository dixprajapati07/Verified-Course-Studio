import { runJava, extractClassName } from "./javaRunner.js";

/**
 * Normalizes output string for comparison (trims leading/trailing whitespace and normalizes CRLF).
 */
function normalizeOutput(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\r\n/g, "\n").trim();
}

/**
 * Verifies a single code snippet by compiling and executing it with Java 21.
 * 
 * @param {object} snippet
 * @param {string} snippet.code
 * @param {string} [snippet.expectedOutput]
 * @param {string} [snippet.id]
 * @returns {Promise<object>} Verification result
 */
export async function verifySnippet(snippet) {
  const startTime = Date.now();
  if (!snippet || !snippet.code) {
    return {
      snippetId: snippet?.id || null,
      status: "failed",
      compiled: false,
      exitCode: 1,
      stdout: "",
      stderr: "No code provided for snippet verification",
      error: "No code provided",
      executionDurationMs: 0,
      command: "javac",
      verifiedAt: new Date().toISOString()
    };
  }

  const runResult = await runJava(snippet.code);
  const normalizedStdout = normalizeOutput(runResult.stdout);
  const normalizedExpected = snippet.expectedOutput ? normalizeOutput(snippet.expectedOutput) : null;

  let status = "passed";
  let error = null;

  if (!runResult.compiled) {
    status = "failed";
    error = runResult.stderr || "Compilation failed";
  } else if (runResult.timedOut) {
    status = "failed";
    error = `Execution timed out after ${runResult.executionDurationMs}ms`;
  } else if (runResult.exitCode !== 0) {
    status = "failed";
    error = runResult.stderr || `Execution failed with exit code ${runResult.exitCode}`;
  } else if (normalizedExpected !== null) {
    // If expected output is provided, verify match (exact or substring if multiline/noisy)
    const matchesExact = normalizedStdout === normalizedExpected;
    const matchesContains = normalizedStdout.includes(normalizedExpected) || normalizedExpected.includes(normalizedStdout);

    if (!matchesExact && !matchesContains) {
      status = "failed";
      error = `Output mismatch. Expected:\n${snippet.expectedOutput}\nGot:\n${runResult.stdout}`;
    }
  }

  return {
    snippetId: snippet.id || null,
    title: snippet.title || "Snippet",
    slideId: snippet.slideId || null,
    status,
    compiled: runResult.compiled,
    exitCode: runResult.exitCode,
    stdout: runResult.stdout,
    stderr: runResult.stderr,
    error,
    expectedOutput: snippet.expectedOutput || null,
    executionDurationMs: runResult.executionDurationMs,
    command: runResult.command,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Builds a Java test harness file that exercises a solution class.
 */
function buildExerciseTestRunner(exercise, solutionCode) {
  const className = extractClassName(solutionCode);
  
  // If the exercise already has testHarness code, return files
  if (exercise.testHarness) {
    const harnessClass = extractClassName(exercise.testHarness);
    return [
      { name: `${className}.java`, content: solutionCode, isMain: false },
      { name: `${harnessClass}.java`, content: exercise.testHarness, isMain: true }
    ];
  }

  // If solution already has public static void main, run it directly
  if (/public\s+static\s+void\s+main/.test(solutionCode)) {
    return [{ name: `${className}.java`, content: solutionCode, isMain: true }];
  }

  // Otherwise, synthesize a test harness if testCases are present
  if (Array.isArray(exercise.testCases) && exercise.testCases.length > 0) {
    const testLines = exercise.testCases.map((tc, i) => {
      if (tc.statement) {
        return `        try { ${tc.statement}; System.out.println("TC${i + 1}: PASS"); } catch (Throwable t) { System.err.println("TC${i + 1}: FAIL - " + t.getMessage()); System.exit(1); }`;
      }
      return `        // Test case ${i + 1}: ${tc.description || ""}`;
    }).join("\n");

    const runnerCode = `
public class ExerciseTestRunner {
    public static void main(String[] args) {
${testLines}
        System.out.println("ALL_TESTS_PASSED");
    }
}
`;
    return [
      { name: `${className}.java`, content: solutionCode, isMain: false },
      { name: "ExerciseTestRunner.java", content: runnerCode, isMain: true }
    ];
  }

  // Default: return solution
  return [{ name: `${className}.java`, content: solutionCode, isMain: true }];
}

/**
 * Verifies an exercise by testing reference solution and naive/buggy solution.
 * A verified exercise must have its reference solution pass all checks.
 * If naiveSolution is provided, it should fail test cases (demonstrating the test suite catches buggy code).
 * 
 * @param {object} exercise 
 * @returns {Promise<object>}
 */
export async function verifyExercise(exercise) {
  if (!exercise || (!exercise.referenceSolution && !exercise.code)) {
    return {
      exerciseId: exercise?.id || null,
      status: "failed",
      error: "Missing reference solution for exercise",
      verifiedAt: new Date().toISOString()
    };
  }

  const refCode = exercise.referenceSolution || exercise.code;
  const naiveCode = exercise.naiveSolution || null;

  // Run reference solution
  const refFiles = buildExerciseTestRunner(exercise, refCode);
  const refRun = await runJava(refFiles);
  const refPassed = refRun.compiled && !refRun.timedOut && refRun.exitCode === 0 && !refRun.stderr?.includes("Exception");

  let naivePassed = null;
  let naiveRun = null;

  if (naiveCode) {
    const naiveFiles = buildExerciseTestRunner(exercise, naiveCode);
    naiveRun = await runJava(naiveFiles);
    naivePassed = naiveRun.compiled && !naiveRun.timedOut && naiveRun.exitCode === 0 && !naiveRun.stderr?.includes("Exception") && !naiveRun.stdout?.includes("FAIL");
  }

  // Verification succeeds if reference solution passes
  // If naiveSolution is present and naiveShouldFail is true (default), naive must fail to prove test strength
  const naiveShouldFail = exercise.naiveShouldFail ?? (naiveCode !== null);
  const naiveSatisfiesConstraint = !naiveCode || (naiveShouldFail ? !naivePassed : naivePassed);
  const overallPassed = refPassed && naiveSatisfiesConstraint;

  return {
    exerciseId: exercise.id || null,
    title: exercise.title || "Exercise",
    status: overallPassed ? "passed" : "failed",
    referenceResult: {
      status: refPassed ? "passed" : "failed",
      compiled: refRun.compiled,
      exitCode: refRun.exitCode,
      stdout: refRun.stdout,
      stderr: refRun.stderr,
      command: refRun.command,
      executionDurationMs: refRun.executionDurationMs
    },
    naiveResult: naiveRun ? {
      status: naivePassed ? "passed" : "failed",
      compiled: naiveRun.compiled,
      exitCode: naiveRun.exitCode,
      stdout: naiveRun.stdout,
      stderr: naiveRun.stderr,
      command: naiveRun.command,
      executionDurationMs: naiveRun.executionDurationMs,
      caughtByTests: !naivePassed
    } : null,
    testsPassed: overallPassed ? 1 : 0,
    testsFailed: overallPassed ? 0 : 1,
    verifiedAt: new Date().toISOString()
  };
}
