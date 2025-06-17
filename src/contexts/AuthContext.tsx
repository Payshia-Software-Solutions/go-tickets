
"use client";

import type { User, SignupFormData } from '@/lib/types'; // Added SignupFormData
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  signup: (data: SignupFormData) => Promise<void>; // Changed signature
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  const signup = async (data: SignupFormData) => { // Changed signature
    setLoading(true);
    const normalizedEmail = data.email.toLowerCase();

    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      setLoading(false);
      throw new Error("This email address is already registered (pre-check).");
    }
    
    // apiCreateUser (which is mockData.createUser) will now expect SignupFormData
    // It will handle constructing the payload for the API, including individual billing fields
    const newUser = await apiCreateUser(data); 
    setUser(newUser);
    localStorage.setItem(localStorageKey, JSON.stringify(newUser));
    setLoading(false);
    // No specific return needed, success is implicit if no error is thrown
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
