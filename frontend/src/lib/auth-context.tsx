'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gql, queries, refreshSession } from '@/lib/api/client';
import type { AuthPayload, User } from '@/types/api';

type AuthState = {
  token: string | null;
  user: User | null;
  ready: boolean;
  acceptSession: (payload: AuthPayload) => void;
  reloadUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const acceptSession = useCallback((payload: AuthPayload) => {
    setToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const reloadUser = useCallback(async () => {
    if (!token) return;
    const result = await gql<{ me: User }>(queries.me, undefined, token);
    setUser(result.me);
  }, [token]);

  const logout = useCallback(async () => {
    if (token) await gql<{ logout: boolean }>(queries.logout, undefined, token);
    setToken(null);
    setUser(null);
  }, [token]);

  useEffect(() => {
    let active = true;
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<AuthPayload>).detail;
      if (detail) acceptSession(detail);
    };
    const onExpired = () => { setToken(null); setUser(null); };
    window.addEventListener('auth:session', onRefresh);
    window.addEventListener('auth:expired', onExpired);
    refreshSession()
      .then((refresh) => { if (active) { setToken(refresh.accessToken); setUser(refresh.user); } })
      .catch(() => undefined)
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; window.removeEventListener('auth:session', onRefresh); window.removeEventListener('auth:expired', onExpired); };
  }, [acceptSession]);

  const value = useMemo(() => ({ token, user, ready, acceptSession, reloadUser, logout }), [token, user, ready, acceptSession, reloadUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

export function Protected({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !token) router.replace('/login'); }, [ready, token, router]);
  if (!ready || !token) return <div className="screen-loader"><span className="loader-dot" />Loading your account…</div>;
  return children;
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && token) router.replace('/dashboard'); }, [ready, token, router]);
  if (!ready || token) return <div className="screen-loader"><span className="loader-dot" />Loading your account…</div>;
  return children;
}
