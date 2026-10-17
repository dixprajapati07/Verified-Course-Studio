// src/api.js
//
// Single source of truth for the backend base URL.
// Override at build time or dev time with a Frontend/.env:
//   VITE_API_URL=http://localhost:5000
//
const API_BASE = (import.meta.env?.VITE_API_URL ?? "http://localhost:5000") + "/api";

function getAuthToken() {
  try {
    return localStorage.getItem("vcs_auth_token") || "dev-token";
  } catch {
    return "dev-token";
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMessage = `Server error (${res.status})`;
      let errorJson = null;
      try {
        errorJson = await res.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        const errorText = await res.text();
        if (errorText) errorMessage = errorText;
      }
      const error = new Error(errorMessage);
      error.status = res.status;
      // Forward `draft` from the server so the UI can retry saving without re-generating
      if (errorJson?.draft) error.draft = errorJson.draft;
      throw error;
    }

    return await res.json();
  } catch (err) {
    // Network / CORS failure → TypeError with no status
    if (err.name === "TypeError" || (!err.status && err.message.toLowerCase().includes("fetch"))) {
      const baseUrl = API_BASE.replace("/api", "");
      const offlineError = new Error(
        `Cannot reach the backend at ${baseUrl}. ` +
        `Is it running? Does CORS allow this origin? (${location.origin})`
      );
      offlineError.isOffline = true;
      offlineError.backendUrl = baseUrl;
      throw offlineError;
    }
    throw err;
  }
}

export const api = {
  // Courses
  async getCourses() {
    return await request("/courses");
  },

  async getCourse(id) {
    return await request(`/courses/${id}`);
  },

  async createCourse(courseData) {
    return await request("/courses", {
      method: "POST",
      body: JSON.stringify(courseData),
    });
  },

  async deleteCourse(id) {
    return await request(`/courses/${id}`, { method: "DELETE" });
  },

  async updateCourse(id, updates) {
    return await request(`/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // AI & Generation
  async generateCourse(params) {
    return await request("/ai/generate-course", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async regenerateCourse(courseId) {
    return await request(`/courses/${courseId}/regenerate`, { method: "POST" });
  },

  async regenerateSlide(courseId, slideIndex) {
    return await request(`/courses/${courseId}/slides/${slideIndex}/regenerate`, {
      method: "POST",
    });
  },

  async regenerateLecture(courseId, lectureNumber) {
    return await request(`/courses/${courseId}/lectures/${lectureNumber}/regenerate`, {
      method: "POST",
    });
  },

  // Verification
  async reverifySnippet(courseId, snippetId, code = null) {
    return await request(`/courses/${courseId}/snippets/${snippetId}/reverify`, {
      method: "POST",
      body: JSON.stringify(code ? { code } : {}),
    });
  },

  async verifySnippet(snippet) {
    return await request("/verify/snippet", {
      method: "POST",
      body: JSON.stringify(snippet),
    });
  },

  async verifyExercise(exercise) {
    return await request("/verify/exercise", {
      method: "POST",
      body: JSON.stringify(exercise),
    });
  },

  // Health
  async getHealth() {
    return await request("/health");
  },
};
