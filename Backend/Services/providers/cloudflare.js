/**
 * Cloudflare Workers AI Provider Adapter
 * Uses the REST API (no separate SDK needed)
 */

const getAccountId = () => process.env.CLOUDFLARE_ACCOUNT_ID;
const getApiToken = () => process.env.CLOUDFLARE_API_TOKEN;
const getModel = () => process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.1-8b-instruct";

export function isCloudflareConfigured() {
  return !!(getAccountId() && getApiToken());
}

/**
 * Call Cloudflare Workers AI via REST API.
 * @param {string} prompt
 * @param {number} timeoutMs
 * @returns {Promise<object>}   - Normalized response
 */
export async function callCloudflare(prompt, timeoutMs = 60000) {
  const accountId = getAccountId();
  const apiToken = getApiToken();
  const model = getModel();

  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not configured in .env");
  }

  const start = Date.now();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert course designer. Always respond with valid JSON only. No markdown, no explanation outside the JSON.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const isRateLimit = response.status === 429;
      return {
        provider: "cloudflare",
        model: model,
        status: isRateLimit ? "rate_limited" : "error",
        content: null,
        durationMs: Date.now() - start,
        usage: null,
        error: `HTTP ${response.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const text = json?.result?.response ?? json?.result;
    if (!text) throw new Error("Cloudflare returned an empty response");

    const rawText = typeof text === "string" ? text : JSON.stringify(text);
    const clean = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("Cloudflare returned non-JSON response");
    }

    return {
      provider: "cloudflare",
      model: model,
      status: "success",
      content: parsed,
      durationMs: Date.now() - start,
      usage: null,
      error: null,
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    return {
      provider: "cloudflare",
      model: model,
      status: isTimeout ? "timeout" : "error",
      content: null,
      durationMs: Date.now() - start,
      usage: null,
      error: err.message,
    };
  }
}
