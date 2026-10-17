import "dotenv/config";
import { supabase, isLocalMode } from "../config/supabase.js";

const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
);

let cachedDevUser = null;

export async function getDevUser() {
  if (cachedDevUser) return cachedDevUser;

  if (!isSupabaseConfigured || isLocalMode) {
    cachedDevUser = {
      id: "00000000-0000-0000-0000-000000000001",
      email: "trainer@example.com",
      role: "authenticated",
      isDev: true
    };
    return cachedDevUser;
  }

  try {
    if (supabase.auth?.admin) {
      const { data } = await supabase.auth.admin.listUsers();
      let dev = data?.users?.find(
        (u) => u.email === "devtrainer@example.com" || u.email === "trainer@example.com"
      );
      if (!dev && data?.users?.length > 0) {
        dev = data.users[0];
      }
      if (!dev) {
        const { data: created } = await supabase.auth.admin.createUser({
          email: "devtrainer@example.com",
          password: "DevTrainerPassword123!",
          email_confirm: true,
          user_metadata: { role: "trainer", name: "Dev Trainer" }
        });
        dev = created?.user;
      }

      if (dev?.id) {
        cachedDevUser = {
          id: dev.id,
          email: dev.email,
          role: "authenticated",
          isDev: true
        };
        return cachedDevUser;
      }
    }
  } catch (err) {
    console.warn("⚠️  Could not resolve dev user from auth.users:", err.message);
  }

  cachedDevUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "trainer@example.com",
    role: "authenticated",
    isDev: true
  };
  return cachedDevUser;
}

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication token is required"
      });
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        error: "Authentication token is required"
      });
    }

    // In dev fallback mode or if token is a dev/guest token
    if (!isSupabaseConfigured || token === "dev-token" || token.startsWith("mock-") || token === "guest-token") {
      req.user = await getDevUser();
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: "Invalid or expired authentication token"
      });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(500).json({
      error: "Authentication verification failed"
    });
  }
}
