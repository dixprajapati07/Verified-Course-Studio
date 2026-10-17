/**
 * Frontend API Client
 * Centralized fetch utility for all backend calls.
 * All AI calls go through the backend — no API keys in frontend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Get auth token from sessionStorage (set by AuthModal on login) */
export function getAuthToken() {
  try {
    return localStorage.getItem("vcs_auth_token") || sessionStorage.getItem("vcs_auth_token") || "dev-token";
  } catch {
    return "dev-token";
  }
}

/**
 * Core fetch wrapper with auth headers, error normalization, and abort support.
 */
async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // For binary responses (e.g., PPTX)
  if (options.binary) {
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API error ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.blob();
  }

  const json = await response.json().catch(() => ({ error: "Invalid JSON response" }));

  if (!response.ok) {
    throw new Error(json?.error || `API error ${response.status}`);
  }

  return json;
}

// ─── AI Endpoints ──────────────────────────────────────────────────────────────

/** Generate a full course */
export async function apiGenerateCourse({ topic, student_level, duration_minutes, language, learning_objectives = '', number_of_lectures, numberOfLectures, parallel = false }) {
  return apiFetch("/api/ai/generate-course", {
    method: "POST",
    body: JSON.stringify({
      topic,
      student_level,
      duration_minutes,
      language,
      learning_objectives,
      number_of_lectures: number_of_lectures || numberOfLectures || 4,
      parallel
    }),
  });
}

/** Generate slides for an existing course */
export async function apiGenerateSlides({ title, description, modules, language, slide_count, course_id, parallel = false }) {
  return apiFetch("/api/ai/generate-slides", {
    method: "POST",
    body: JSON.stringify({ title, description, modules, language, slide_count, course_id, parallel }),
  });
}

/** Generate trainer notes */
export async function apiGenerateNotes({ title, modules, language, parallel = false }) {
  return apiFetch("/api/ai/generate-notes", {
    method: "POST",
    body: JSON.stringify({ title, modules, language, parallel }),
  });
}

/** Generate code examples */
export async function apiGenerateCode({ title, modules, language, runtime, parallel = false }) {
  return apiFetch("/api/ai/generate-code", {
    method: "POST",
    body: JSON.stringify({ title, modules, language, runtime, parallel }),
  });
}

/** Generate exercises */
export async function apiGenerateExercises({ title, modules, language, student_level, parallel = false }) {
  return apiFetch("/api/ai/generate-exercises", {
    method: "POST",
    body: JSON.stringify({ title, modules, language, student_level, parallel }),
  });
}

/** Generate quiz questions */
export async function apiGenerateQuiz({ title, modules, language, question_count, parallel = false }) {
  return apiFetch("/api/ai/generate-quiz", {
    method: "POST",
    body: JSON.stringify({ title, modules, language, question_count, parallel }),
  });
}

/** Generate cheat sheet */
export async function apiGenerateCheatSheet({ title, modules, language, parallel = false }) {
  return apiFetch("/api/ai/generate-cheatsheet", {
    method: "POST",
    body: JSON.stringify({ title, modules, language, parallel }),
  });
}

/** Generate verification report */
export async function apiGenerateVerification({ title, course_content, language }) {
  return apiFetch("/api/ai/generate-verification", {
    method: "POST",
    body: JSON.stringify({ title, course_content, language }),
  });
}

/** Get configured providers */
export async function apiGetProviders() {
  return apiFetch("/api/ai/providers");
}

// ─── Auth Endpoints ────────────────────────────────────────────────────────────

export async function apiRegister({ email, password }) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogin({ email, password }) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** Generate spoken audio for slide text through the backend ElevenLabs proxy */
export async function apiSpeak(text) {
  return apiFetch("/api/tts/speech", {
    method: "POST",
    body: JSON.stringify({ text }),
    binary: true,
  });
}

// ─── Course CRUD ───────────────────────────────────────────────────────────────

/** Get all courses for authenticated user */
export async function apiGetCourses() {
  return apiFetch("/api/courses");
}

/** Get a single course */
export async function apiGetCourse(courseId) {
  return apiFetch(`/api/courses/${courseId}`);
}

/** Create a course (requires auth) */
export async function apiCreateCourse(courseData) {
  return apiFetch("/api/courses", {
    method: "POST",
    body: JSON.stringify(courseData),
  });
}

/** Export course as PPTX by ID */
export async function apiExportPptx(courseId) {
  return apiFetch(`/api/export/courses/${courseId}/pptx`, { binary: true });
}

/** Directly export any course JSON as PPTX */
export async function apiExportPptxDirect(course) {
  return apiFetch("/api/export/pptx", {
    method: "POST",
    body: JSON.stringify({ course }),
    binary: true,
  });
}

/** Helper to trigger browser download for PPTX */
export async function downloadCoursePptx(courseOrId) {
  let blob;
  let filename = "course.pptx";
  if (typeof courseOrId === "string") {
    blob = await apiExportPptx(courseOrId);
    filename = `${courseOrId}.pptx`;
  } else {
    blob = await apiExportPptxDirect(courseOrId);
    if (courseOrId?.title) {
      filename = `${courseOrId.title.replace(/[^a-zA-Z0-9_-]+/g, "_")}.pptx`;
    }
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** Save auth token to sessionStorage */
export function saveAuthToken(token) {
  try {
    sessionStorage.setItem("vcs_auth_token", token);
  } catch {}
}

/** Clear auth token */
export function clearAuthToken() {
  try {
    sessionStorage.removeItem("vcs_auth_token");
  } catch {}
}

/** Check if user is authenticated */
export function isAuthenticated() {
  return !!getAuthToken();
}

