const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1';

const TOKEN_KEY = 'ph_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Error carrying the API's own code and field details. */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** { fieldPath: message } from a 422, for inline form errors. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(this.details.map((d) => [d.path, d.message]));
  }
}

let onUnauthorized = null;

/** Registered by AuthProvider so a stale token clears session state once. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(method, path, { body, signal, raw } = {}) {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    // Cookies matter beyond auth: the signed device-id cookie is what the
    // default dedup mode identifies a repeat voter by.
    credentials: 'include',
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return null;
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, 'request_failed', 'Request failed');
    return res;
  }

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(
      res.status,
      err.code ?? 'request_failed',
      err.message ?? `Request failed (${res.status})`,
      err.details,
    );
  }

  return data;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  del: (path, body, opts) => request('DELETE', path, { ...opts, body }),

  /** Trigger a file download without leaving the page. */
  async download(path, filename) {
    const res = await request('GET', path, { raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// --- endpoint map ---------------------------------------------------------
// One place that knows the API's shape, so a route change is a single edit.

export const authApi = {
  signup: (body) => api.post('/auth/signup', body),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  requestReset: (email) => api.post('/auth/password/request-reset', { email }),
  resetPassword: (body) => api.post('/auth/password/reset', body),
  googleUrl: () => `${BASE}/auth/google`,
};

export const pollsApi = {
  create: (body) => api.post('/polls', body),
  list: (params = {}) => api.get(`/polls?${new URLSearchParams(params)}`),
  listPublic: (params = {}) => api.get(`/polls/public?${new URLSearchParams(params)}`),
  get: (id) => api.get(`/polls/${id}`),
  getBySlug: (slug) => api.get(`/polls/slug/${slug}`),
  update: (id, body) => api.patch(`/polls/${id}`, body),
  publish: (id) => api.post(`/polls/${id}/publish`),
  close: (id) => api.post(`/polls/${id}/close`),
  archive: (id) => api.post(`/polls/${id}/archive`),
  duplicate: (id) => api.post(`/polls/${id}/duplicate`),
  qrUrl: (id) => `${BASE}/polls/${id}/qr.svg`,
};

export const responsesApi = {
  submit: (slug, body) => api.post(`/polls/${slug}/responses`, body),
  status: (slug) => api.get(`/polls/${slug}/status`),
};

export const analyticsApi = {
  get: (id) => api.get(`/polls/${id}/analytics`),
  textAnswers: (id, questionId) => api.get(`/polls/${id}/questions/${questionId}/answers`),
  exportCsv: (id, slug) => api.download(`/polls/${id}/export.csv`, `poll-${slug}.csv`),
};

export const invitesApi = {
  issue: (id, body) => api.post(`/polls/${id}/invites`, body),
  list: (id) => api.get(`/polls/${id}/invites`),
};

export const uploadsApi = {
  sign: (kind) => api.post('/uploads/sign', { kind }),
};

export const notificationsApi = {
  registerToken: (body) => api.post('/notifications/tokens', body),
  revokeToken: (token) => api.del('/notifications/tokens', { token }),
  preferences: () => api.get('/notifications/preferences'),
  setPreference: (body) => api.put('/notifications/preferences', body),
};

export const moderationApi = {
  report: (body) => api.post('/moderation/reports', body),
  reports: () => api.get('/moderation/reports'),
  uphold: (id) => api.post(`/moderation/reports/${id}/uphold`),
  dismiss: (id) => api.post(`/moderation/reports/${id}/dismiss`),
};
