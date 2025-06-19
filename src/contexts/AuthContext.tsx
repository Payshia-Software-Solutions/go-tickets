
"use client";

import type { User, SignupFormData } from '@/lib/types'; // Removed direct import of BillingAddress
import { loginUserWithApi, createUser as apiCreateUser, updateUser as apiUpdateUser, getUserByEmail } from '@/lib/mockData';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, passwordFromForm: string) => Promise<void>;
  logout: () => void;
  signup: (data: SignupFormData) => Promise<void>;
  updateUser: (userId: string, dataToUpdate: Partial<Pick<User, 'name' | 'email' | 'billingAddress'>>) => Promise<User | null>;
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
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure the stored user has a billingAddress structure if individual fields exist.
        // This helps bridge older stored user objects.
        if (parsedUser && !parsedUser.billingAddress && (parsedUser.billing_street || parsedUser.billing_city)) {
            parsedUser.billingAddress = {
                street: parsedUser.billing_street || "",
                city: parsedUser.billing_city || "",
                state: parsedUser.billing_state || "",
                postalCode: parsedUser.billing_postal_code || "",
                country: parsedUser.billing_country || "",
            };
        }
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error);
        localStorage.removeItem(localStorageKey); // Clear corrupted data
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, passwordFromForm: string): Promise<void> => {
    setLoading(true);
    const normalizedEmail = email.toLowerCase();
    try {
      const loggedInUser = await loginUserWithApi(normalizedEmail, passwordFromForm);
      setUser(loggedInUser);
      localStorage.setItem(localStorageKey, JSON.stringify(loggedInUser));
    } catch (error) {
      console.error("Login attempt failed in AuthContext:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
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

  const updateUser = async (userId: string, dataToUpdate: Partial<Pick<User, 'name' | 'email' | 'billingAddress'>>) => {
    if (!user || user.id !== userId) {
      console.error("AuthContext: updateUser called for non-matching or non-logged-in user.");
      return null;
    }
    setLoading(true);
    try {
      const updatedUserFromApi = await apiUpdateUser(userId, dataToUpdate);
      if (updatedUserFromApi) {
        setUser(updatedUserFromApi);
        localStorage.setItem(localStorageKey, JSON.stringify(updatedUserFromApi));
        return updatedUserFromApi;
      }
      return null;
    } catch (error) {
      console.error("AuthContext: Error calling apiUpdateUser", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateUser, loading }}>
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
