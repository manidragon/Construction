import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentialsOrEmail: { email: string; password: string } | string, maybePassword?: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('erp_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('erp_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentialsOrEmail: { email: string; password: string } | string, maybePassword?: string) => {
    setIsLoading(true);
    try {
      const credentials = typeof credentialsOrEmail === 'string'
        ? { email: credentialsOrEmail, password: maybePassword || '' }
        : credentialsOrEmail;
      const res = await api.login(credentials);
      if (res.success && res.token && res.user) {
        localStorage.setItem('erp_token', res.token);
        localStorage.setItem('erp_user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.switchRole(role);
      if (res.success && res.token && res.user) {
        localStorage.setItem('erp_token', res.token);
        localStorage.setItem('erp_user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'OWNER' || user.role === 'TENANT_ADMIN') return true; // Super Admin & Owners have all permissions
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        switchRole,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
