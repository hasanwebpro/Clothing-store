/**
 * Axios client — the single API communication layer.
 *
 * SDA Note: All API calls in the app go through THIS file.
 * It handles:
 *   1. Base URL configuration
 *   2. JWT access token injection on every request
 *   3. Silent token refresh when access token expires (401)
 *   4. Error normalization
 *
 * This is the "Adapter" concept on the frontend — if the backend URL
 * changes, only this file needs updating.
 */
import axios from 'axios';

// Use a relative path so requests go through Vite's proxy (/api → localhost:8000).
// This makes cookies same-origin (localhost:3000 → localhost:3000/api) so the
// httpOnly refresh-token cookie is always sent, even after a full browser close.
// In production, VITE_API_URL can be set to the absolute backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── In-memory access token store ──────────────────────────────────────────
// We store the access token in memory (NOT localStorage) to prevent XSS attacks.
// The refresh token lives in an httpOnly cookie managed by the browser.
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };
export const getAccessToken = () => accessToken;

// ── Axios instance ────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // sends httpOnly cookie (refresh token) automatically
});

// ── Request interceptor: attach access token ──────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 → silent refresh ─────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If 401 and we haven't retried yet → try refresh
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {}, { withCredentials: true });
        setAccessToken(data.access);
        processQueue(null, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        // Clear cached user profile — session is gone.
        // Do NOT hard-redirect; ProtectedRoute handles that for protected pages.
        localStorage.removeItem('user');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
