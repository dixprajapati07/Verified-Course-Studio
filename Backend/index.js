import "dotenv/config";
import { validateEnv } from "./config/env.js";
import app from "./app.js";
import { supabase, isLocalMode } from "./config/supabase.js";

// Abort early if any required env vars are missing
validateEnv();

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, async () => {
  console.log(`\n✅ Backend running at http://localhost:${PORT}\n`);

  // ── Startup table probe ─────────────────────────────────────────────────────
  if (!isLocalMode) {
    try {
      const { error } = await supabase.from("courses").select("id").limit(1);
      if (error) {
        console.error(
          "\n⚠️  DATABASE PROBE FAILED — the 'courses' table may not exist or a column is missing.\n" +
          `   Supabase error code   : ${error.code}\n` +
          `   Supabase error message: ${error.message}\n` +
          (error.hint ? `   Hint: ${error.hint}\n` : "") +
          "\n   ➡  Run Backend/supabase/migrations/001_courses.sql in the Supabase SQL Editor.\n"
        );
      } else {
        console.log("✅ Database probe OK — 'courses' table is reachable.\n");
      }
    } catch (probeErr) {
      console.error("\n⚠️  Database probe threw an exception:", probeErr.message, "\n");
    }
  } else {
    console.log("ℹ️  Running in local file store mode — skipping database probe.\n");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ Port ${PORT} is already in use.\n` +
      `   Stop the other process or set a different PORT in .env\n\n` +
      `   To find the process on Windows:\n` +
      `     netstat -ano | findstr :${PORT}\n` +
      `     tasklist /FI "PID eq <pid>"\n` +
      `     taskkill /PID <pid> /F\n`
    );
  } else {
    console.error(`\n❌ Server error: ${err.message}\n`, err);
  }
  process.exit(1);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Closing server…`);
  server.close(() => {
    console.log("   Server closed. Bye!");
    process.exit(0);
  });
  // Force-exit if it takes too long
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
