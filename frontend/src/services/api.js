import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080';
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
export const API_BASE_URL = normalizedBaseUrl.endsWith('/api') ? normalizedBaseUrl : `${normalizedBaseUrl}/api`;

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => { const token = localStorage.getItem('clrms_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response, (error) => {
  const url = error.config?.url || '';
  const isPublicAuthRequest = /^\/auth\/(login|register|forgot-password|reset-password)(?:\/|$)/.test(url);
  if (error.response?.status === 401 && localStorage.getItem('clrms_token') && !isPublicAuthRequest) {
    localStorage.removeItem('clrms_token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});
export default api;
