// Base API URL configuration
// In local development or same-host deployment, this defaults to '' (relative path)
// On Vercel, set VITE_API_URL in Environment Variables (e.g. https://your-backend.onrender.com)
export const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  : '';

export const apiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
};

export default {
  API_BASE,
  apiUrl
};
