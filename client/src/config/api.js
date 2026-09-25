// In local development or same-host deployment, this defaults to '' (relative path)
// On Vercel, set VITE_API_URL (or VITE_BACKEND_URL) in Environment Variables (e.g. https://your-backend.onrender.com)
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
export const API_BASE = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

export const apiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
};

export default {
  API_BASE,
  apiUrl
};
