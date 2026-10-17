/**
 * Groq AI Provider Adapter
 * Uses groq-sdk
 */
import Groq from "groq-sdk";

const getApiKey = () => process.env.GROQ_API_KEY;
const getModel = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function isGroqConfigured() {
  return !!getApiKey();
}

function buildClient() {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in .env");
  }
  return new Groq({ apiKey });
}

/**
 * Call Groq with a JSON-mode prompt.
 * @param {string} prompt
 * @param {number} timeoutMs
 * @returns {Promise<object>}   - Normalized response
 */
export async function callGroq(prompt, timeoutMs = 60000) {
  const client = buildClient();
  const model = getModel();
  const start = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert course designer. Always respond with valid JSON only. No markdown, no explanation outside the JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 8192,
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);

    const text = completion.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned an empty response");

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Groq returned non-JSON response");
    }

    return {
      provider: "groq",
      model,
      status: "success",
      content: parsed,
      durationMs: Date.now() - start,
      usage: completion.usage || null,
      error: null,
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    const isRateLimit = err.status === 429;
    return {
      provider: "groq",
      model,
      status: isTimeout ? "timeout" : isRateLimit ? "rate_limited" : "error",
      content: null,
      durationMs: Date.now() - start,
      usage: null,
      error: err.message,
    };
  }
}
