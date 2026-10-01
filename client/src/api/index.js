const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:4000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function fail(message, response) {
  const error = new Error(message);
  error.status = response.status;
  return error;
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  const text = await response.text();

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      (response.status === 401
        ? 'Your session has expired. Please log in again.'
        : `Request failed with status ${response.status}`);

    throw fail(message, response);
  }

  return payload;
}

async function requestText(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const text = await response.text();

    if (text) {
      try {
        message = JSON.parse(text).error || message;
      } catch {
        message = text;
      }
    }

    throw fail(message, response);
  }

  return response.text();
}

export async function generateNotes(transcriptText, sourceType = 'paste') {
  return request('/meetings/generate', {
    method: 'POST',
    body: { sourceText: transcriptText, sourceType },
  });
}

export async function updateNotes(id, notes) {
  return request(`/meetings/${id}`, {
    method: 'PATCH',
    body: { notes },
  });
}

export async function regenerateNotes(id) {
  return request(`/meetings/${id}/regenerate`, { method: 'POST' });
}

export async function login(email, password) {
  const data = await request('/auth/login', { method: 'POST', body: { email, password } });
  return data;
}

export async function register(email, password) {
  const data = await request('/auth/register', { method: 'POST', body: { email, password } });
  return data;
}

export async function getMeetings() {
  return request('/meetings');
}

export async function getMeeting(id) {
  return request(`/meetings/${id}`);
}

export async function deleteMeeting(id) {
  return request(`/meetings/${id}`, { method: 'DELETE' });
}

export async function getMarkdownExport(id) {
  return requestText(`/meetings/${id}/export`);
}

export { request, requestText };
