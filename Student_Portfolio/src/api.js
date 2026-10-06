const BASE_URL = 'http://localhost:5000';

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

