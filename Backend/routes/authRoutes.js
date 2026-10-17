import express from "express";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../config/supabase.js";

const router = express.Router();

const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: "Valid email and a password of at least 8 characters are required"
      });
    }

    const { data: createdUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true
      });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      console.error("Registration sign-in error:", error.message);
      return res.status(500).json({ error: "Account created but sign-in failed" });
    }

    return res.status(201).json({
      message: "Registration successful",
      user: data.user || createdUser.user,
      session: data.session
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    return res.status(500).json({
      error: "Registration failed"
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error || !data.session) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    return res.json({
      message: "Login successful",
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      error: "Login failed"
    });
  }
});

export default router;
