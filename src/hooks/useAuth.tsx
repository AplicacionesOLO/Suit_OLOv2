import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import {
  getCurrentSession,
  getCurrentUser,
  getPlatformUser,
  onAuthStateChange,
  loginWithEmail,
  loginWithGoogle,
  logout as authLogout,
  sendPasswordReset,
  type PlatformUser,
} from '@/services/auth/authService';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  platformUser: PlatformUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  clearError: () => void;
  isAuthenticated: boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformUser = useCallback(async (authUserId: string) => {
    const pUser = await getPlatformUser(authUserId);
    setPlatformUser(pUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const currentSession = await getCurrentSession();
        if (!mounted) return;

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          fetchPlatformUser(currentSession.user.id).then(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const subscription = onAuthStateChange((newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        fetchPlatformUser(newSession.user.id);
      } else {
        setPlatformUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchPlatformUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const result = await loginWithEmail({ email, password });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return { error: result.error.message };
    }
    setSession(result.session);
    setUser(result.user);
    if (result.user) {
      await fetchPlatformUser(result.user.id);
    }
    setLoading(false);
    navigate('/dashboard');
    return { error: null };
  }, [navigate, fetchPlatformUser]);

  const loginGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    await loginWithGoogle();
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    await authLogout();
    setSession(null);
    setUser(null);
    setPlatformUser(null);
    setLoading(false);
    navigate('/login');
  }, [navigate]);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    const result = await sendPasswordReset(email);
    if (result.error) {
      setError(result.error.message);
      return { error: result.error.message };
    }
    return { error: null };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshPermissions = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await fetchPlatformUser(currentUser.id);
    }
  }, [fetchPlatformUser]);

  const value: AuthContextValue = {
    session,
    user,
    platformUser,
    loading,
    error,
    login,
    loginGoogle,
    logout,
    resetPassword,
    clearError,
    isAuthenticated: !!session && !!user,
    refreshPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}