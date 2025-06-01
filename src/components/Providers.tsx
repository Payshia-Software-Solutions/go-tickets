
"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <Toaster />
      </CartProvider>
    </AuthProvider>
  );
}
