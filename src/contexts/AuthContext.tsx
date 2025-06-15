
"use client";

import type { User }from '@/lib/types';
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  signup: (name: string, email: string) => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast(); // Initialize useToast
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
    const normalizedEmail = email.toLowerCase(); // Normalize email

    try {
      const existingUser = await getUserByEmail(normalizedEmail); // Check with normalized email
      if (existingUser) {
        setLoading(false);
        toast({ title: "Signup Failed", description: "This email address is already registered.", variant: "destructive" });
        return false;
      }

      // If no existing user, proceed to create
      const newUser = await apiCreateUser({ email: normalizedEmail, name }); // Use normalized email for creation
      setUser(newUser);
      localStorage.setItem(localStorageKey, JSON.stringify(newUser));
      setLoading(false);
      return true;

    } catch (error: any) { // Catch errors from getUserByEmail or apiCreateUser
      setLoading(false);
      // The error from apiCreateUser might already be "email already in use" from the API
      toast({ title: "Signup Failed", description: error.message || "An unexpected error occurred. Please try again.", variant: "destructive" });
      return false;
    }
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

