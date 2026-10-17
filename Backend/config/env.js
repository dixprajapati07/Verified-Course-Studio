/**
 * config/env.js
 *
 * Validates required environment variables at startup.
 * Prints the NAMES of missing variables and exits with code 1 if any are absent.
 * Never logs secret values.
 */

const REQUIRED_VARS = [
  "GEMINI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "\n❌ Missing required environment variables:\n" +
      missing.map((k) => `   - ${k}`).join("\n") +
      "\n\n   Copy .env.example → .env and fill in the missing values.\n"
    );
    process.exit(1);
  }
}
