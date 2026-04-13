import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/http';

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  avatar?: string | null;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, phone?: string, location?: string, avatar?: File) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'bbagrar_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await apiRequest<{ user: AuthUser }>('/api/me', { token });
        setUser(data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    login: async (identifier, password) => {
      const data = await apiRequest<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    },
    register: async (username, email, password, phone, location, avatar) => {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      if (phone) formData.append('phone', phone);
      if (location) formData.append('location', location);
      if (avatar) formData.append('avatar', avatar);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4001'}/api/auth/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    },
  }), [user, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRole() {
  const { user } = useAuth();

  return {
    role: user?.role,
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'admin',
    isWorker: user?.role === 'worker',
    isAccountant: user?.role === 'accountant',
    isViewer: user?.role === 'viewer'
  };
}