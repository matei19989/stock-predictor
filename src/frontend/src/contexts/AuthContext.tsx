import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
import { decodeJwtPayload, isTokenExpired } from '@/utils/jwtUtils';
import type { AuthResponse } from '@/types';
import * as authService from '@/services/authService';

interface User {
  username: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Called by login/register after a successful API response. */
  setAuthFromResponse: (response: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function restoreSession(): { token: string | null; user: User | null } {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return { token: null, user: null };

  const payload = decodeJwtPayload(stored);
  if (!payload || isTokenExpired(payload)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }

  const userJson = localStorage.getItem(USER_KEY);
  if (userJson) {
    try {
      return { token: stored, user: JSON.parse(userJson) as User };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }
  }
  return { token: stored, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser]   = useState<User | null>(() => restoreSession().user);
  const [token, setToken] = useState<string | null>(() => restoreSession().token);

  const setAuthFromResponse = useCallback((response: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify({ username: response.username, email: response.email }));
    setToken(response.token);
    setUser({ username: response.username, email: response.email });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await authService.login(email, password);
    setAuthFromResponse(response);
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') ?? '/dashboard';
    navigate(returnTo, { replace: true });
  }, [navigate, setAuthFromResponse]);

  const register = useCallback(
    async (username: string, email: string, password: string): Promise<void> => {
      const response = await authService.register(username, email, password);
      setAuthFromResponse(response);
      navigate('/dashboard', { replace: true });
    },
    [navigate, setAuthFromResponse]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    navigate('/');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading: false,
        login,
        register,
        logout,
        setAuthFromResponse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
