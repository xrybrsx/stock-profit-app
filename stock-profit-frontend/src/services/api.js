import axios from 'axios';


const rawBase = import.meta.env.VITE_API_BASE_URL || '';
// Ensure base ends with '/api' when pointing to the same origin backend
let base = '/api';
if (rawBase) {
  const trimmed = rawBase.replace(/\/$/, '');
  base = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
// If the bundle was built with a localhost base but we're running on a non-local host,
// force same-origin '/api' to avoid cross-origin/misrouting in production (e.g., Azure).
if (typeof window !== 'undefined') {
  const hn = window.location.hostname;
  const isLocalHost = hn === 'localhost' || hn === '127.0.0.1';
  if (!isLocalHost && /localhost|127\.0\.0\.1/.test(base)) {
    base = '/api';
  }
}
// Log which API base URL the frontend will use (useful inside container)
// Do not expose secrets
// eslint-disable-next-line no-console
console.log('[FRONTEND] API base URL:', base);

// Point to your NestJS backend
const api = axios.create({
  baseURL: base,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY,
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed. Please check your API key.');
    }
    return Promise.reject(error);
  }
);

// Log outgoing requests (method + URL only) and basic responses
api.interceptors.request.use((config) => {
  const redactedHeaders = { ...(config.headers || {}) };
  if (redactedHeaders['X-API-Key']) {
    redactedHeaders['X-API-Key'] = '***';
  }
  // eslint-disable-next-line no-console
  console.log('[FRONTEND] ->', config.method?.toUpperCase(), `${config.baseURL || ''}${config.url}`, 'headers:', redactedHeaders);
  return config;
});
api.interceptors.response.use(
  (res) => {
    // eslint-disable-next-line no-console
    console.log('[FRONTEND] <-', res.status, res.config.method?.toUpperCase(), `${res.config.baseURL || ''}${res.config.url}`);
    return res;
  },
  (err) => {
    const cfg = err.config || {};
    // eslint-disable-next-line no-console
    console.log('[FRONTEND] x ', err.response?.status || 'ERR', cfg.method?.toUpperCase(), `${cfg.baseURL || ''}${cfg.url}`);
    return Promise.reject(err);
  }
);

export async function getStatsReady() {
  const res = await api.get(`/profit/stats-ready?t=${Date.now()}`);
  return res.data.ready; // returns true or false
}

export default api;
