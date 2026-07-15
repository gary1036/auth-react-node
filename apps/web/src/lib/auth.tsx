import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  clearTokens,
  getAccessToken,
  setTokens,
  type User,
} from './api';
import { defaultHomePath, type Role } from './roles';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name?: string) => Promise<User>;
  logout: () => Promise<void>;
  applyOAuthTokens: (accessToken: string, refreshToken: string) => Promise<User>;
  refreshProfile: () => Promise<void>;
  homePath: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    const response = await authApi.me();
    setUser(response.data.user);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshProfile();
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setTokens(response.data);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const response = await authApi.register({ email, password, name });
    setTokens(response.data);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const applyOAuthTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    setTokens({ accessToken, refreshToken });
    const response = await authApi.me();
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      login,
      register,
      logout,
      applyOAuthTokens,
      refreshProfile,
      homePath: user ? defaultHomePath(user.role) : '/login',
    }),
    [user, loading, login, register, logout, applyOAuthTokens, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
