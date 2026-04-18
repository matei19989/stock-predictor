import axios, { type AxiosError } from 'axios';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
import type { ApiError } from '@/types';

// ── ApiException ──────────────────────────────────────────────────────────────

export class ApiException extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly correlationId?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.detail || error.title);
    this.name = 'ApiException';
    this.status = error.status;
    this.title = error.title;
    this.detail = error.detail;
    this.correlationId = error.correlationId;
    this.fieldErrors = error.errors;
  }
}

// ── Axios instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
});

// Attach JWT on every request.
// Reads from localStorage at call time — never captures the value in a closure.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors and handle 401.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';
      // Only unauthenticated auth endpoints should bypass the redirect-on-401.
      // Authenticated endpoints under /api/auth/ (e.g. PUT /api/auth/password)
      // get a 401 when their JWT is invalid — that's the textbook clear-and-redirect case.
      const unauthenticatedAuthEndpoints = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/confirm-email',
        '/api/auth/resend-confirmation',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
      ];
      const isUnauthenticatedAuthCall = unauthenticatedAuthEndpoints.some(
        (path) => requestUrl === path || requestUrl.endsWith(path),
      );

      if (!isUnauthenticatedAuthCall) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        window.location.href = '/login';
        return Promise.reject(
          new ApiException({ status: 401, title: 'Unauthorized', detail: 'Session expired' })
        );
      }
      // 401s from the unauthenticated auth endpoints fall through so the
      // calling form (LoginForm, RegisterForm, …) can render the real detail.
    }

    const data = error.response?.data;
    if (data && typeof data === 'object' && 'title' in data) {
      throw new ApiException(data as ApiError);
    }

    throw new ApiException({
      status: error.response?.status ?? 0,
      title: 'Network Error',
      detail: error.message ?? 'An unexpected error occurred',
    });
  }
);

export default api;
