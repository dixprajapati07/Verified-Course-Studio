import assert from "node:assert/strict";
import { runJava } from "../Services/javaRunner.js";
import { verifySnippet, verifyExercise } from "../Services/verifier.js";

async function testValidJava() {
  console.log("▶ Running Test 1: Valid Java compiles and executes...");
  const validCode = `
public class HelloJava {
    public static void main(String[] args) {
        System.out.println("Hello Java 21!");
    }
}
`;
  const result = await runJava(validCode);
  assert.equal(result.compiled, true, "Should compile successfully");
  assert.equal(result.exitCode, 0, "Exit code should be 0");
  assert.equal(result.timedOut, false, "Should not time out");
  assert.ok(result.stdout.includes("Hello Java 21!"), `Expected stdout to contain 'Hello Java 21!', got: ${result.stdout}`);
  assert.ok(result.executionDurationMs > 0, "Execution duration should be measured");
  console.log("  ✔ Test 1 passed: Valid Java compiled & executed with exit code 0.");
}

async function testBrokenJava() {
  console.log("▶ Running Test 2: Broken Java returns compilation failure without throwing...");
  const brokenCode = `
public class BrokenSyntax {
    public static void main(String[] args) {
        int x = "incompatible types"; // Compile error
    }
}
`;
  let result;
  try {
    result = await runJava(brokenCode);
  } catch (err) {
    assert.fail(`runJava should not throw an unhandled exception on broken code: ${err.message}`);
  }

  assert.equal(result.compiled, false, "Compilation should fail");
  assert.notEqual(result.exitCode, 0, "Exit code should be non-zero");
  assert.ok(result.stderr.length > 0, "Stderr should contain compiler error message");
  assert.ok(
    result.stderr.toLowerCase().includes("incompatible") || result.stderr.toLowerCase().includes("error"),
    `Stderr should mention compilation error, got: ${result.stderr}`
  );
  console.log("  ✔ Test 2 passed: Broken Java captured compilation failure in stderr.");
}

async function testInfiniteLoopTimeout() {
  console.log("▶ Running Test 3: Infinite loop times out cleanly at <= 10s...");
  const infiniteLoopCode = `
public class InfiniteLoop {
    public static void main(String[] args) {
        System.out.println("Loop starting...");
        while (true) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                break;
            }
        }
    }
}
`;
  const startTime = Date.now();
  // Using 3000ms timeout for fast unit test execution while verifying timeout logic
  const result = await runJava(infiniteLoopCode, { timeoutMs: 3000 });
  const elapsed = Date.now() - startTime;

  assert.equal(result.compiled, true, "Should compile successfully");
  assert.equal(result.timedOut, true, "Should be marked as timed out");
  assert.equal(result.exitCode, -1, "Exit code should be -1 on timeout");
  assert.ok(elapsed >= 2500 && elapsed <= 6000, `Elapsed time should be around 3s, was ${elapsed}ms`);
  assert.ok(result.stderr.includes("timed out"), `Stderr should report timeout, got: ${result.stderr}`);
  console.log(`  ✔ Test 3 passed: Infinite loop timed out cleanly after ${elapsed}ms.`);
}

async function testExerciseVerification() {
  console.log("▶ Running Test 4: verifyExercise with reference passing and naive failing...");
  const exercise = {
    id: "ex-test-01",
    title: "Palindrome Checker",
    referenceSolution: `
public class PalindromeChecker {
    public static boolean isPalindrome(String s) {
        if (s == null) return false;
        String clean = s.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        return clean.equals(new StringBuilder(clean).reverse().toString());
    }

    public static void main(String[] args) {
        if (!isPalindrome("A man, a plan, a canal: Panama")) {
            System.err.println("TC1 failed");
            System.exit(1);
        }
        if (!isPalindrome("racecar")) {
            System.err.println("TC2 failed");
            System.exit(1);
        }
        if (isPalindrome("hello")) {
            System.err.println("TC3 failed");
            System.exit(1);
        }
        System.out.println("ALL_TESTS_PASSED");
    }
}
`,
    // Naive solution with a bug: case-sensitive or doesn't strip punctuation, so fails "A man..."
    naiveSolution: `
public class PalindromeChecker {
    public static boolean isPalindrome(String s) {
        if (s == null) return false;
        // Bug: Doesn't clean punctuation or ignore case!
        return s.equals(new StringBuilder(s).reverse().toString());
    }

    public static void main(String[] args) {
        if (!isPalindrome("A man, a plan, a canal: Panama")) {
            System.err.println("TC1 failed");
            System.exit(1);
        }
        if (!isPalindrome("racecar")) {
            System.err.println("TC2 failed");
            System.exit(1);
        }
        if (isPalindrome("hello")) {
            System.err.println("TC3 failed");
            System.exit(1);
        }
        System.out.println("ALL_TESTS_PASSED");
    }
}
`,
    naiveShouldFail: true
  };

  const result = await verifyExercise(exercise);
  assert.equal(result.status, "passed", "Exercise verification should pass because reference passes and naive fails");
  assert.equal(result.referenceResult.status, "passed", "Reference solution should pass");
  assert.equal(result.naiveResult.status, "failed", "Naive solution should fail and be caught by tests");
  assert.equal(result.naiveResult.caughtByTests, true, "Should indicate naive solution was caught by tests");
  console.log("  ✔ Test 4 passed: verifyExercise confirmed reference solution passed and naive solution failed.");
}

async function runAll() {
  console.log("=========================================");
  console.log("Verified Course Studio - Verifier Tests");
  console.log("=========================================\n");

  try {
    await testValidJava();
    await testBrokenJava();
    await testInfiniteLoopTimeout();
    await testExerciseVerification();
    console.log("\n=========================================");
    console.log("🎉 ALL 4 VERIFIER TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error);
    process.exit(1);
  }
}

runAll();
