// Baked in at build time. In Docker the frontend is built with VITE_API_URL=/backend
// so Nginx proxies API calls on the same origin; on Vercel it is the Railway URL;
// locally it falls back to :5000. A trailing slash is tolerated.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const TOKEN_KEY = 'tm_token';

// Called by AuthContext so any 401 anywhere in the app clears the session
// and bounces the user back to the login screen.
let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Single fetch wrapper for the whole app.
 * Attaches the bearer token, parses the JSON envelope, and turns any non-2xx
 * response into an ApiError carrying the status code.
 */
const request = async (path, { method = 'GET', body, auth = true } = {}) => {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();

    if (token) {
      // Exact format the backend middleware expects, space included
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status === 401) {
    if (onUnauthorized) {
      onUnauthorized();
    }

    throw new ApiError(payload?.error || 'Session expired, please log in again', 401);
  }

  if (!response.ok) {
    const details = payload?.details
      ? Object.values(payload.details).join(', ')
      : null;

    throw new ApiError(details || payload?.error || 'Request failed', response.status);
  }

  return payload;
};

/* ---------- Auth ---------- */

export const registerUser = async ({ name, email, password }) => {
  const body = await request('/auth/register', {
    method: 'POST',
    body: { name, email, password },
    auth: false,
  });

  return { user: body.data, token: body.token };
};

export const loginUser = async ({ email, password }) => {
  const body = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });

  return { user: body.data, token: body.token };
};

export const fetchMe = async () => {
  const body = await request('/auth/me');
  return body.data;
};

export const logoutUser = async () => {
  await request('/auth/logout', { method: 'POST' });
};

/* ---------- Tasks (all protected) ---------- */

export const getTasks = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.all) query.set('all', 'true');
  if (params.status) query.set('status', params.status);
  const qs = query.toString() ? `?${query.toString()}` : '';

  const body = await request(`/tasks${qs}`);
  return body.data;
};

export const createTask = async (task) => {
  const body = await request('/tasks', { method: 'POST', body: task });
  return body.data;
};

export const updateTask = async (id, task) => {
  const body = await request(`/tasks/${id}`, { method: 'PUT', body: task });
  return body.data;
};

export const deleteTask = async (id) => {
  const body = await request(`/tasks/${id}`, { method: 'DELETE' });
  return body.data;
};

/* ---------- Users / Admin (protected) ---------- */

export const getUsers = async () => {
  const body = await request('/users');
  return body.data;
};

export const updateUserRole = async (id, role) => {
  const body = await request(`/users/${id}/role`, {
    method: 'PUT',
    body: { role },
  });
  return body.data;
};

export const deleteUser = async (id) => {
  const body = await request(`/users/${id}`, {
    method: 'DELETE',
  });
  return body.data;
};


/* ---------- Events & Async Jobs (Practical 10) ---------- */

/**
 * Opens the Server-Sent Events stream. EventSource cannot send headers, so a
 * single-use ticket is exchanged for the JWT first and passed in the URL.
 */
export const openEventStream = async ({ onEvent, onStatus }) => {
  const { ticket } = await request('/api/events/ticket', { method: 'POST' });
  const source = new EventSource(`${BASE_URL}/api/events/stream?ticket=${ticket}`);

  source.addEventListener('connected', () => onStatus('connected'));
  source.addEventListener('domain-event', (e) => onEvent(JSON.parse(e.data)));
  // A ticket is single-use, so the browser's auto-reconnect would be rejected:
  // close and let the caller open a fresh stream instead.
  source.onerror = () => {
    source.close();
    onStatus('disconnected');
  };

  return () => source.close();
};

export const getEventHistory = async (limit = 50) => {
  const body = await request(`/api/events/history?limit=${limit}`);
  return body.data;
};

export const getEventStats = async () => {
  const body = await request('/api/events/stats');
  return body.data;
};

export const enqueueJob = async (type) => {
  return request('/api/jobs', { method: 'POST', body: { type } });
};

export const getJobs = async () => {
  const body = await request('/api/jobs');
  return body.data;
};

export const downloadJobExport = async (id) => {
  const response = await fetch(`${BASE_URL}/api/jobs/${id}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!response.ok) {
    throw new ApiError('Export is not available', response.status);
  }

  return response.blob();
};

/* ---------- AI Task Assistant (Practical 13) ---------- */

// The browser only talks to our backend; the AI provider key never reaches the client
export const getAiSuggestion = async ({ title, description }) => {
  const body = await request('/api/ai/suggest', {
    method: 'POST',
    body: { title, description },
  });
  return { ...body.data, disclaimer: body.disclaimer };
};

export const getAiStatus = async () => {
  const body = await request('/api/ai/status');
  return body.data;
};
