const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fetch with timeout and JSON parsing helper.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMsg = `Server returned status ${res.status}`;
      try {
        const errorData = await res.json();
        errMsg = errorData.error || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }

    // If expecting a blob (for PDF/DOCX downloads)
    if (options.responseType === 'blob') {
      return await res.blob();
    }

    return await res.json();
  } catch (err) {
    console.error(`[API Client] Error on ${options.method || 'GET'} ${endpoint}:`, err);
    throw err;
  }
}

// ---------------- Presentation & Slide Notes API ----------------

export async function getPresentations() {
  return request('/presentations');
}

export async function getPresentation(id) {
  return request(`/presentations/${id}`);
}

export async function getNotes(presentationId) {
  return request(`/presentations/${presentationId}/notes`);
}

export async function generateAllNotes(presentationId) {
  return request(`/presentations/${presentationId}/notes/generate`, {
    method: 'POST'
  });
}

export async function regenerateSlideNotes(slideId, level) {
  return request(`/slides/${slideId}/notes/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ level })
  });
}

export async function saveSlideNotes(slideId, notesData) {
  return request(`/slides/${slideId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify(notesData)
  });
}

export async function exportNotes(presentationId, format = 'pdf') {
  return request(`/presentations/${presentationId}/notes/export?format=${format}`, {
    responseType: 'blob'
  });
}

// ---------------- Code Execution & Playground API ----------------

export async function getCodeExamples() {
  return request('/code-examples');
}

export async function getCodeExample(id) {
  return request(`/code-examples/${id}`);
}

export async function generateCodeExample({ topic, language, difficulty, lessonObjective }) {
  return request('/code-examples/generate', {
    method: 'POST',
    body: JSON.stringify({ topic, language, difficulty, lessonObjective })
  });
}

export async function runCode({ language, code, stdin = '', codeExampleId }) {
  return request('/code-examples/run', {
    method: 'POST',
    body: JSON.stringify({ language, code, stdin, codeExampleId })
  });
}

export async function verifyCodeExample(id, code) {
  return request(`/code-examples/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

export async function fixCode({ language, code, errorOutput }) {
  return request('/code-examples/fix', {
    method: 'POST',
    body: JSON.stringify({ language, code, errorOutput })
  });
}

export async function getExecutionHistory() {
  return request('/code-examples/history');
}
