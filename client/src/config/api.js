// API Configuration with automatic fallback to live Render backend
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.endsWith('.local')
);

// If running in production (Vercel) and VITE_API_URL is not provided, default to live Render service
const fallbackBackend = isLocalhost ? '' : 'https://kt1-nlv3.onrender.com';
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || fallbackBackend;

export const API_BASE = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

export const apiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
};

export default {
  API_BASE,
  apiUrl
};
