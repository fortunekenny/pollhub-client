import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authApi, setToken, getToken, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Any 401 anywhere in the app drops the session once, rather than each
    // caller inventing its own handling.
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [clear]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),

      async login(credentials) {
        const { user: me, token } = await authApi.login(credentials);
        setToken(token);
        setUser(me);
        return me;
      },

      async signup(details) {
        const { user: me, token } = await authApi.signup(details);
        setToken(token);
        setUser(me);
        return me;
      },

      /**
       * Adopt a token minted elsewhere — the OAuth callback, which hands one
       * back through the URL fragment rather than a response body.
       *
       * Verifies it with /auth/me instead of trusting it: the token arrived
       * through the address bar, where anything could have put it.
       */
      async adoptSession(token) {
        setToken(token);
        try {
          const { user: me } = await authApi.me();
          setUser(me);
          return me;
        } catch (err) {
          clear();
          throw err;
        }
      },

      async logout() {
        try {
          await authApi.logout();
        } finally {
          // Clear locally even if the request fails — the user asked to leave.
          clear();
        }
      },

      setUser,
    }),
    [user, loading, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
