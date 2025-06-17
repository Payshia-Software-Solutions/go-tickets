
"use client";

import type { User, SignupFormData } from '@/lib/types';
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, passwordFromForm: string) => Promise<boolean>; // Updated signature
  logout: () => void;
  signup: (data: SignupFormData) => Promise<void>;
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

  const login = async (email: string, passwordFromForm: string) => { // Updated signature
    setLoading(true);
    const normalizedEmail = email.toLowerCase();
    const foundUser = await getUserByEmail(normalizedEmail);

    if (foundUser) {
      // IMPORTANT: This is a placeholder for actual password verification
      // In a real application, the passwordFromForm should be sent to a backend endpoint
      // which would then compare it securely against the stored hash.
      // The client should NEVER directly compare a plaintext password with a stored hash.
      
      let loginSuccess = false;

      if (!foundUser.password || foundUser.password === "") {
        // If user record has no password or empty password, allow login (e.g. legacy users)
        loginSuccess = true;
        console.warn(`User ${foundUser.email} logged in without password check (empty password in DB).`);
      } else {
        // If user has a password (hash) in DB, simulate check against a known test password
        // THIS IS NOT SECURE FOR PRODUCTION. Replace with backend validation.
        if (passwordFromForm === "password123") { // Placeholder for actual password check
          loginSuccess = true;
          console.warn(`User ${foundUser.email} logged in using placeholder password "password123". THIS IS NOT SECURE.`);
        } else {
          console.log(`Login failed for ${foundUser.email}: Incorrect placeholder password provided. Expected "password123" for users with a stored password hash in this mock setup.`);
        }
      }

      if (loginSuccess) {
        setUser(foundUser);
        localStorage.setItem(localStorageKey, JSON.stringify(foundUser));
        setLoading(false);
        return true;
      }
    }
    
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(localStorageKey);
  };

  const signup = async (data: SignupFormData) => {
    setLoading(true);
    try {
      const normalizedEmail = data.email.toLowerCase();
      const existingUser = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error("This email address is already registered (pre-check).");
      }
      const newUser = await apiCreateUser(data);
      setUser(newUser);
      localStorage.setItem(localStorageKey, JSON.stringify(newUser));
    } finally {
      setLoading(false);
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

