
import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import ttsRoutes from "./routes/ttsRoutes.js";
import verifyRoutes from "./routes/verifyRoutes.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// Read allowed origins from env (comma-separated) with safe defaults for local dev.
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (curl, server-to-server, health checks)
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// ── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ message: "Verified Course Studio Backend is running" });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/courses", courseRoutes);
app.use("/api/auth",    authRoutes);
app.use("/api/ai",      aiRoutes);
app.use("/api/export",  exportRoutes);
app.use("/api/verify",  verifyRoutes);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

// ── Health ───────────────────────────────────────────────────────────────────
// Probes Java availability without crashing if it is missing.
function getJavaVersion() {
  return new Promise((resolve) => {
    execFile("javac", ["-version"], { timeout: 5000 }, (err, _stdout, stderr) => {
      if (err) {
        resolve({ available: false, error: err.message });
      } else {
        // javac prints to stderr: "javac 21.0.x"
        const version = (stderr || _stdout || "").trim();
        resolve({ available: true, version });
      }
    });
  });
}

app.use("/api/tts", ttsRoutes);

app.get("/api/health", async (_req, res) => {
  const java = await getJavaVersion();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    java,
    corsOrigins: allowedOrigins,
  });
});

export default app;
