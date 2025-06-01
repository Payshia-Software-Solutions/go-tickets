
"use client";

import type { User }from '@/lib/types';
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>; // Simple mock, pass not used
  logout: () => void;
  signup: (name: string, email: string, pass: string) => Promise<boolean>; // Simple mock
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const localStorageKey = 'mypassUser';

  useEffect(() => {
    // Check if user is stored in localStorage (simple persistence)
    const storedUser = localStorage.getItem(localStorageKey);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, _pass: string) => {
    setLoading(true);
    const foundUser = await getUserByEmail(email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(localStorageKey, JSON.stringify(foundUser));
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(localStorageKey);
  };

  const signup = async (name: string, email: string, _pass: string) => {
    setLoading(true);
    let existingUser = await getUserByEmail(email);
    if (existingUser) {
      setLoading(false);
      return false; // User already exists
    }
    const newUser = await apiCreateUser({ email, name });
    setUser(newUser);
    localStorage.setItem(localStorageKey, JSON.stringify(newUser));
    setLoading(false);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
