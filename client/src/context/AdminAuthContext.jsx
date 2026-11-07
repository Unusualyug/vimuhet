import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints.js';
import { setToken, apiErrorMessage } from '../services/api.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    if (!localStorage.getItem('vimuhet_admin_token')) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.adminMe();
      setAdmin(data.admin);
      setPermissions(data.permissions || []);
    } catch {
      setToken(null, 'admin');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    const onExpired = () => {
      setAdmin(null);
      setToken(null, 'admin');
    };
    const onRefreshed = (e) => {
      if (e.detail?.scope === 'admin' && e.detail?.payload?.admin) {
        setAdmin(e.detail.payload.admin);
        setPermissions(e.detail.payload.admin.permissions || []);
      }
    };
    window.addEventListener('vimuhet:session-expired', onExpired);
    window.addEventListener('vimuhet:token-refreshed', onRefreshed);
    return () => {
      window.removeEventListener('vimuhet:session-expired', onExpired);
      window.removeEventListener('vimuhet:token-refreshed', onRefreshed);
    };
  }, [hydrate]);

  const login = useCallback(async (credentials) => {
    try {
      const { data } = await authApi.adminLogin(credentials);
      sessionStorage.setItem('vimuhet_has_session', '1');
      setToken(data.accessToken, 'admin');
      setAdmin(data.admin);
      setPermissions(data.admin.permissions || []);
      return data.admin;
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Unable to sign in'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem('vimuhet_has_session');
    setToken(null, 'admin');
    setAdmin(null);
    setPermissions([]);
  }, []);

  const can = useCallback(
    (permission) => !permission || admin?.role === 'SUPER_ADMIN' || permissions.includes(permission),
    [permissions, admin]
  );

  const value = useMemo(
    () => ({ admin, permissions, loading, login, logout, can, refresh: hydrate, isAuthenticated: Boolean(admin) }),
    [admin, permissions, loading, login, logout, can, hydrate]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
};
