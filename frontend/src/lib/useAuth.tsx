'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from './types';
import { api, getAuthToken, setAuthToken } from './api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const activeToken = getAuthToken();
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      setToken(activeToken);
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.warn('Session expired or invalid, clearing token.');
      setAuthToken(null);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password, role);
      setToken(res.token);
      const profile = await api.getMe();
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
