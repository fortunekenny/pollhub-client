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

/**
 * Endpoints a 401 must not trigger a refresh for.
 *
 * Sign-in routes because a 401 there means wrong credentials, and retrying
 * with the same ones is pointless noise. /auth/refresh itself because that is
 * how the recursion ends.
 */
const NO_REFRESH = ['/auth/login', '/auth/signup', '/auth/refresh'];

let refreshing = null;

/**
 * Trade the refresh cookie for a new access token.
 *
 * Single-flight: a page that fires five requests on mount gets five 401s at
 * once, and five parallel rotations would revoke each other — the refresh
 * token rotates on use, so the second caller would present one the first has
 * already spent, which the API reads as reuse and responds to by killing every
 * session the user has.
 */
function refreshSession() {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const data = safeParse(await res.text());
      if (!data?.token) return false;
      setToken(data.token);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

async function request(method, path, { body, signal, raw } = {}, allowRefresh = true) {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    // Cookies matter beyond auth: the signed device-id cookie is what the
    // default dedup mode identifies a repeat voter by, and the refresh cookie
    // is what keeps a session alive past the access token's fifteen minutes.
    credentials: 'include',
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // An expired access token is the common case, not an error: refresh once and
  // replay the request, so the caller never sees it. Only ever one retry —
  // `allowRefresh` is false on the way back through.
  if (res.status === 401 && allowRefresh && !NO_REFRESH.includes(path.split('?')[0])) {
    if (await refreshSession()) {
      return request(method, path, { body, signal, raw }, false);
    }
  }

  if (res.status === 204) return null;
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, 'request_failed', 'Request failed');
    return res;
  }

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? {};
    // Reached only once refreshing has been tried and failed, so this now
    // means "the session is genuinely over" rather than "the token aged out".
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
  refresh: () => api.post('/auth/refresh'),
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
  series: (id) => api.get(`/polls/${id}/series`),
  // Stops the repeat and closes the current round. No further rounds open.
  endSeries: (id) => api.post(`/polls/${id}/end-series`),
  // Permanent. The API decides which statuses are allowed, by role.
  remove: (id) => api.del(`/polls/${id}`),
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

// `/health` is the one endpoint outside the versioned prefix, so it is built
// from the origin instead of BASE.
const HEALTH_URL = new URL('/health', new URL(BASE, window.location.origin)).href;

let featuresPromise = null;

/**
 * Which optional integrations this deployment of the API actually has wired up.
 *
 * Fetched once per page load and shared by every caller: an uploader renders
 * once per poll option, and a request per option to learn the same flag would
 * be absurd.
 *
 * A failed probe resolves to {} rather than rejecting, and callers read a
 * missing flag as "available" — letting the real endpoint report the problem
 * beats hiding a working feature because one request lost the network.
 */
export function apiFeatures() {
  featuresPromise ??= fetch(HEALTH_URL)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => data?.features ?? {})
    .catch(() => ({}));
  return featuresPromise;
}

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
