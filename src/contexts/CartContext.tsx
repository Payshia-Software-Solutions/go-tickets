
"use client";

import type { CartItem, Event, TicketType } from '@/lib/types'; // Removed ShowTime
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CartContextType {
  cart: CartItem[];
  addToCart: (event: Event, ticketType: TicketType, quantity: number, showTimeId: string) => void;
  removeFromCart: (ticketTypeId: string, showTimeId: string) => void; // Needs showTimeId for uniqueness
  updateQuantity: (ticketTypeId: string, showTimeId: string, quantity: number) => void; // Needs showTimeId
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const localStorageKey = 'mypassCart';

  useEffect(() => {
    const storedCart = localStorage.getItem(localStorageKey);
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0 || localStorage.getItem(localStorageKey)) {
         localStorage.setItem(localStorageKey, JSON.stringify(cart));
    }
    if (cart.length === 0 && localStorage.getItem(localStorageKey)) {
      localStorage.removeItem(localStorageKey);
    }
  }, [cart]);

  const addToCart = (event: Event, ticketType: TicketType, quantity: number, showTimeId: string) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.ticketTypeId === ticketType.id && item.eventId === event.id && item.showTimeId === showTimeId
      );
      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += quantity;
        return updatedCart;
      } else {
        return [
          ...prevCart,
          {
            eventId: event.id,
            eventNsid: event.slug,
            eventName: event.name,
            ticketTypeId: ticketType.id,
            ticketTypeName: ticketType.name,
            quantity,
            pricePerTicket: ticketType.price,
            showTimeId: showTimeId, // Store the showTimeId
          }
        ];
      }
    });
  };

  const removeFromCart = (ticketTypeId: string, showTimeId: string) => {
    setCart(prevCart => prevCart.filter(item => !(item.ticketTypeId === ticketTypeId && item.showTimeId === showTimeId)));
  };

  const updateQuantity = (ticketTypeId: string, showTimeId: string, quantity: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        (item.ticketTypeId === ticketTypeId && item.showTimeId === showTimeId) ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter(item => item.quantity > 0) // Remove if quantity is 0
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(localStorageKey);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.quantity * item.pricePerTicket, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

