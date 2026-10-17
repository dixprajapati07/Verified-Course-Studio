import { verifySnippet, verifyExercise } from "./verifier.js";
import { runJava } from "./javaRunner.js";

/**
 * Calls Gemini if available to generate code, otherwise uses a topic-specific fallback template.
 */
async function callGeminiOrFallback({ prompt, previousError = null, attempt = 1, topic = "Java Collections" }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

      let systemPrompt = `You are an expert Java 21 instructor and software engineer.
Generate ONLY valid, compilable Java 21 code. Return raw Java code inside \`\`\`java code blocks or as raw text.
Ensure there is a public class with a \`public static void main(String[] args)\` method.
The code must be completely self-contained and run without external dependencies.`;

      let userPrompt = prompt;
      if (previousError) {
        userPrompt += `\n\nATTEMPT ${attempt} FAILED with this compiler/runtime error:
${previousError}
Please fix the code so it compiles with Java 21 and runs cleanly without errors.`;
      }

      const response = await ai.models.generateContent({
        model,
        contents: `${systemPrompt}\n\n${userPrompt}`
      });

      const text = response.text || "";
      const codeMatch = text.match(/```(?:java)?\s*([\s\S]*?)```/) || [null, text];
      const cleanCode = (codeMatch[1] || text).trim();
      if (cleanCode.length > 20) {
        return cleanCode;
      }
    } catch (err) {
      console.warn("Gemini call failed in verifiedGenerator, falling back to local generator:", err.message);
    }
  }

  // Deterministic high-quality Java 21 templates when Gemini is not configured or in offline dev
  return getJavaTemplateForTopic(topic, prompt, attempt);
}

function getJavaTemplateForTopic(topic, prompt, attempt) {
  const p = (prompt + " " + topic).toLowerCase();

  if (p.includes("hashmap") || p.includes("map")) {
    return `import java.util.HashMap;
import java.util.Map;

public class HashMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> scores = new HashMap<>();
        scores.put("Alice", 95);
        scores.put("Bob", 82);
        scores.put("Carol", 88);
        System.out.println("Alice: " + scores.get("Alice"));
        System.out.println("Contains Bob: " + scores.containsKey("Bob"));
        System.out.println("Total entries: " + scores.size());
    }
}`;
  }

  if (p.includes("hashset") || p.includes("set")) {
    return `import java.util.HashSet;
import java.util.Set;

public class HashSetDemo {
    public static void main(String[] args) {
        Set<String> tags = new HashSet<>();
        tags.add("java");
        tags.add("collections");
        tags.add("java"); // duplicate ignored
        System.out.println("Size: " + tags.size());
        System.out.println("Contains java: " + tags.contains("java"));
    }
}`;
  }

  if (p.includes("linkedlist") || p.includes("deque") || p.includes("queue")) {
    return `import java.util.LinkedList;

public class LinkedListDemo {
    public static void main(String[] args) {
        LinkedList<Integer> list = new LinkedList<>();
        list.add(10);
        list.add(20);
        list.addFirst(5);
        list.addLast(30);
        System.out.println("First: " + list.peekFirst());
        System.out.println("Last: " + list.peekLast());
        System.out.println("Size: " + list.size());
    }
}`;
  }

  if (p.includes("stream") || p.includes("filter")) {
    return `import java.util.List;
import java.util.stream.Collectors;

public class StreamsDemo {
    public static void main(String[] args) {
        List<String> names = List.of("Alice", "Bob", "Charlie", "Anna");
        List<String> filtered = names.stream()
            .filter(name -> name.startsWith("A"))
            .map(String::toUpperCase)
            .collect(Collectors.toList());
        System.out.println("Filtered: " + filtered);
    }
}`;
  }

  // Default ArrayList demo
  return `import java.util.ArrayList;
import java.util.List;

public class ArrayListDemo {
    public static void main(String[] args) {
        List<String> items = new ArrayList<>();
        items.add("Apple");
        items.add("Banana");
        items.add("Cherry");
        System.out.println("First: " + items.get(0));
        System.out.println("Size: " + items.size());
        for (String item : items) {
            System.out.println(item);
        }
    }
}`;
}

/**
 * Generates verified Java code snippet with up to VERIFY_MAX_ATTEMPTS retries.
 * 
 * @param {object} options
 * @param {string} options.topic
 * @param {string} [options.title]
 * @param {string} [options.prompt]
 * @param {string} [options.code]
 * @param {string} [options.expectedOutput]
 * @param {string} [options.slideId]
 * @param {string} [options.snippetId]
 * @returns {Promise<object>}
 */
export async function generateVerifiedSnippet(options) {
  const maxAttempts = parseInt(process.env.VERIFY_MAX_ATTEMPTS, 10) || 3;
  const attempts = [];
  let currentCode = options.code || null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (!currentCode || attempt > 1) {
      currentCode = await callGeminiOrFallback({
        prompt: options.prompt || `Create a beginner-friendly Java 21 snippet demonstrating ${options.title || options.topic}`,
        previousError: lastError,
        attempt,
        topic: options.topic
      });
    }

    const verification = await verifySnippet({
      id: options.snippetId,
      title: options.title,
      slideId: options.slideId,
      code: currentCode,
      expectedOutput: options.expectedOutput
    });

    attempts.push({
      attemptNumber: attempt,
      code: currentCode,
      compiled: verification.compiled,
      exitCode: verification.exitCode,
      stdout: verification.stdout,
      stderr: verification.stderr,
      status: verification.status,
      durationMs: verification.executionDurationMs,
      timestamp: new Date().toISOString()
    });

    if (verification.status === "passed") {
      return {
        ...verification,
        code: currentCode,
        attemptsCount: attempt,
        attempts
      };
    }

    lastError = verification.stderr || verification.error;
    currentCode = null; // force regeneration in next iteration
  }

  // If all attempts failed, return the final verification with full attempt history
  const lastAttempt = attempts[attempts.length - 1];
  return {
    snippetId: options.snippetId || null,
    title: options.title || "Snippet",
    slideId: options.slideId || null,
    status: "failed",
    compiled: lastAttempt?.compiled ?? false,
    exitCode: lastAttempt?.exitCode ?? 1,
    stdout: lastAttempt?.stdout ?? "",
    stderr: lastAttempt?.stderr ?? "Failed after max verification attempts",
    error: lastAttempt?.stderr || "Exceeded max attempts without clean verification",
    code: lastAttempt?.code || options.code || "",
    expectedOutput: options.expectedOutput || null,
    executionDurationMs: lastAttempt?.durationMs ?? 0,
    command: `javac --release 21`,
    attemptsCount: attempts.length,
    attempts,
    verifiedAt: new Date().toISOString()
  };
}
