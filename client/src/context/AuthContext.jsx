import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints.js';
import { setToken, apiErrorMessage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hydrate = useCallback(async () => {
    if (!localStorage.getItem('vimuhet_token')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    const onExpired = () => {
      setUser(null);
      setToken(null);
    };
    const onRefreshed = (e) => {
      if (e.detail?.scope === 'customer' && e.detail?.payload?.user) setUser(e.detail.payload.user);
    };
    window.addEventListener('vimuhet:session-expired', onExpired);
    window.addEventListener('vimuhet:token-refreshed', onRefreshed);
    return () => {
      window.removeEventListener('vimuhet:session-expired', onExpired);
      window.removeEventListener('vimuhet:token-refreshed', onRefreshed);
    };
  }, [hydrate]);

  const login = useCallback(async (credentials) => {
    setError('');
    try {
      const { data } = await authApi.login(credentials);
      sessionStorage.setItem('vimuhet_has_session', '1');
      setToken(data.accessToken);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = apiErrorMessage(err, 'Unable to sign in');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setError('');
    try {
      const { data } = await authApi.register(payload);
      sessionStorage.setItem('vimuhet_has_session', '1');
      setToken(data.accessToken);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const message = apiErrorMessage(err, 'Unable to create your account');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* offline sign-out still clears local state */
    }
    sessionStorage.removeItem('vimuhet_has_session');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await authApi.updateMe(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, setError, login, register, logout, updateProfile, refresh: hydrate, isAuthenticated: Boolean(user) }),
    [user, loading, error, login, register, logout, updateProfile, hydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
