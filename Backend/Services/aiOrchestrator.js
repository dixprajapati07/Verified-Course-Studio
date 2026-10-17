/**
 * AI Orchestrator
 * Central module that dispatches requests to configured providers.
 *
 * Modes:
 *   MODE A — "parallel": All configured providers run concurrently.
 *             Best response is selected deterministically.
 *   MODE B — "single":   One provider runs. Falls back to next available on failure.
 */

import { callGemini, isGeminiConfigured } from "./providers/gemini.js";
import { callGroq, isGroqConfigured } from "./providers/groq.js";
import { callCloudflare, isCloudflareConfigured } from "./providers/cloudflare.js";

export const PROVIDER_TIMEOUT_MS = 60_000;

/** Return list of currently configured providers */
export function getConfiguredProviders() {
  const providers = [];
  if (isGeminiConfigured()) providers.push("gemini");
  if (isGroqConfigured()) providers.push("groq");
  if (isCloudflareConfigured()) providers.push("cloudflare");
  return providers;
}

/**
 * Dispatch a prompt to a single named provider.
 * @param {string} provider  - "gemini" | "groq" | "cloudflare"
 * @param {string} prompt
 * @param {object|null} schema  - optional JSON schema hint (Gemini only)
 * @returns {Promise<NormalizedResult>}
 */
async function dispatchToProvider(provider, prompt, schema = null) {
  switch (provider) {
    case "gemini":
      return callGemini(prompt, schema, PROVIDER_TIMEOUT_MS);
    case "groq":
      return callGroq(prompt, PROVIDER_TIMEOUT_MS);
    case "cloudflare":
      return callCloudflare(prompt, PROVIDER_TIMEOUT_MS);
    default:
      return {
        provider,
        model: "unknown",
        status: "error",
        content: null,
        durationMs: 0,
        usage: null,
        error: `Unknown provider: ${provider}`,
      };
  }
}

/**
 * Select the best result from an array of NormalizedResult objects.
 * Priority: completeness > first success > any non-null content
 */
function selectBest(results, validate) {
  const successful = results.filter((r) => r.status === "success" && r.content);

  if (!successful.length) return null;

  if (validate) {
    const valid = successful.filter((r) => {
      try {
        validate(r.content);
        return true;
      } catch {
        return false;
      }
    });
    if (valid.length) return valid[0];
  }

  return successful[0];
}

/**
 * Run in parallel across all configured providers.
 * @param {string} prompt
 * @param {object|null} schema
 * @param {function|null} validate - throws if content is invalid
 * @returns {{ best: NormalizedResult|null, all: NormalizedResult[] }}
 */
export async function runParallel(prompt, schema = null, validate = null) {
  const configured = getConfiguredProviders();
  if (!configured.length) {
    throw new Error("No AI providers are configured. Add at least one API key to Backend/.env");
  }

  const settled = await Promise.allSettled(
    configured.map((p) => dispatchToProvider(p, prompt, schema))
  );

  const all = settled.map((s) =>
    s.status === "fulfilled"
      ? s.value
      : {
          provider: "unknown",
          model: "unknown",
          status: "error",
          content: null,
          durationMs: 0,
          usage: null,
          error: s.reason?.message || "Unexpected rejection",
        }
  );

  const best = selectBest(all, validate);
  return { best, all };
}

/**
 * Run against a single provider, falling back through the list.
 * @param {string[]} preferredOrder  - provider names in priority order
 * @param {string} prompt
 * @param {object|null} schema
 * @param {function|null} validate
 * @returns {NormalizedResult}
 */
export async function runSingle(
  preferredOrder,
  prompt,
  schema = null,
  validate = null
) {
  const configured = getConfiguredProviders();
  const ordered = preferredOrder.filter((p) => configured.includes(p));

  // fallback: use any configured provider not in the preferred list
  const rest = configured.filter((p) => !ordered.includes(p));
  const toTry = [...ordered, ...rest];

  if (!toTry.length) {
    throw new Error("No AI providers are configured. Add at least one API key to Backend/.env");
  }

  let lastResult = null;
  for (const provider of toTry) {
    const result = await dispatchToProvider(provider, prompt, schema);
    lastResult = result;

    if (result.status === "success" && result.content) {
      if (validate) {
        try {
          validate(result.content);
          return result;
        } catch (validationErr) {
          result.status = "error";
          result.error = `Validation failed: ${validationErr.message}`;
          continue;
        }
      }
      return result;
    }

    // Don't retry auth failures
    if (result.error?.includes("401") || result.error?.includes("403")) break;
  }

  return (
    lastResult || {
      provider: "none",
      model: "none",
      status: "error",
      content: null,
      durationMs: 0,
      usage: null,
      error: "All providers failed",
    }
  );
}

/**
 * Main entry point — selects mode automatically or per explicit flag.
 * @param {string} prompt
 * @param {object} options
 * @param {boolean} options.parallel       - force parallel mode
 * @param {string[]} options.preferredProviders
 * @param {object|null} options.schema
 * @param {function|null} options.validate
 */
export async function generate(prompt, options = {}) {
  const {
    parallel = false,
    preferredProviders = ["groq", "cloudflare", "gemini"],
    schema = null,
    validate = null,
  } = options;

  if (parallel) {
    const { best, all } = await runParallel(prompt, schema, validate);
    if (!best) {
      throw new Error(
        `All providers failed. Details: ${all.map((r) => `${r.provider}: ${r.error}`).join("; ")}`
      );
    }
    return { result: best, all };
  }

  const result = await runSingle(preferredProviders, prompt, schema, validate);
  if (result.status !== "success" || !result.content) {
    throw new Error(`Generation failed: ${result.error || "Unknown error"} (provider: ${result.provider})`);
  }

  return { result, all: [result] };
}
