
"use client";

import type { User }from '@/lib/types';
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
// Removed: import { useToast } from '@/hooks/use-toast'; 

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  signup: (name: string, email: string) => Promise<void>; 
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed: const { toast } = useToast(); 
  const localStorageKey = 'mypassUser';

  useEffect(() => {
    const storedUser = localStorage.getItem(localStorageKey);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    const normalizedEmail = email.toLowerCase();
    const foundUser = await getUserByEmail(normalizedEmail);
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

  const signup = async (name: string, email: string) => {
    setLoading(true);
    const normalizedEmail = email.toLowerCase(); 

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      setLoading(false);
      throw new Error("This email address is already registered (pre-check).");
    }
    
    const newUser = await apiCreateUser({ email: normalizedEmail, name });
    setUser(newUser);
    localStorage.setItem(localStorageKey, JSON.stringify(newUser));
    setLoading(false);
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

