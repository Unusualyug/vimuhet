import axios from 'axios';
import { readConsentSync } from '../context/ConsentContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const guestId = () => {
  let id = localStorage.getItem('vimuhet_guest_id');
  if (!id) {
    id = `g_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('vimuhet_guest_id', id);
  }
  return id;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
});

const getStoredToken = (scope) => localStorage.getItem(scope === 'admin' ? 'vimuhet_admin_token' : 'vimuhet_token');

export const setToken = (token, scope = 'customer') => {
  const key = scope === 'admin' ? 'vimuhet_admin_token' : 'vimuhet_token';
  if (token) localStorage.setItem(key, token);
  else localStorage.removeItem(key);
};

let refreshing = null;
export const onUnauthorized = (handler) => api.interceptors.response.use(null, (error) => {
  if (error?.response?.status === 401) handler?.();
  return Promise.reject(error);
});

api.interceptors.request.use((config) => {
  // Admin scope covers /admin/* endpoints *and* /auth/admin/* routes.
  const url = config.url || '';
  const isAdminScope = /(^|\/)admin(\/|$)/.test(url) || config.headers?.['x-scope'] === 'admin';
  const scope = isAdminScope ? 'admin' : 'customer';
  const token = getStoredToken(scope);
  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-guest-id'] = guestId();
  /* Consent travels with every request so the API can enforce it. Read straight
     from storage (not React state) to avoid a circular dependency. */
  config.headers['x-consent'] = JSON.stringify(readConsentSync());
  config.headers['x-session-id'] = sessionStorage.getItem('vimuhet_session') || '';
  config.headers['x-visitor-id'] = localStorage.getItem('vimuhet_visitor') || '';
  delete config.headers['x-scope'];
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh request.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;
    if (status !== 401 || original?._retry || original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshing) {
        refreshing = api.post('/auth/refresh').finally(() => {
          setTimeout(() => {
            refreshing = null;
          }, 0);
        });
      }
      const res = await refreshing;
      const data = res.data?.data || {};
      if (data.accessToken) {
        sessionStorage.setItem('vimuhet_has_session', '1');
        const isAdmin = Boolean(data.admin);
        setToken(data.accessToken, isAdmin ? 'admin' : 'customer');
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        window.dispatchEvent(
          new CustomEvent('vimuhet:token-refreshed', { detail: { scope: isAdmin ? 'admin' : 'customer', payload: data } })
        );
        return api(original);
      }
      throw error;
    } catch (refreshError) {
      // A throttled or unreachable refresh endpoint is transient — keep the session
      // and let the caller surface the error instead of silently signing the user out.
      const transient = [429, 500, 502, 503, 504].includes(refreshError?.response?.status) || !refreshError?.response;
      if (!transient) window.dispatchEvent(new CustomEvent('vimuhet:session-expired'));
      return Promise.reject(refreshError);
    }
  }
);

export const apiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data;
  if (data?.details?.length) return data.details[0].message || fallback;
  return data?.message || error?.message || fallback;
};

export default api;
