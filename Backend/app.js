
import express from "express";
import cors from "cors";
import courseRoutes from "./routes/courseRoutes.js";

import authRoutes from "./routes/authRoutes.js";

import aiRoutes from "./routes/aiRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
  ],
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Verified Course Studio Backend is running"
  });
});

app.use("/api/courses", courseRoutes);
 
app.use("/api/auth", authRoutes);

app.use("/api/ai", aiRoutes);

app.use("/api/export", exportRoutes);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});



export default app;
