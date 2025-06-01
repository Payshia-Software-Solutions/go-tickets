
"use client";

import type { CartItem, Event, TicketType } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CartContextType {
  cart: CartItem[];
  addToCart: (event: Event, ticketType: TicketType, quantity: number) => void;
  removeFromCart: (ticketTypeId: string) => void;
  updateQuantity: (ticketTypeId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem('eventHorizonCart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    if (cart.length > 0 || localStorage.getItem('eventHorizonCart')) {
         localStorage.setItem('eventHorizonCart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (event: Event, ticketType: TicketType, quantity: number) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.ticketTypeId === ticketType.id && item.eventId === event.id);
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
          }
        ];
      }
    });
  };

  const removeFromCart = (ticketTypeId: string) => {
    setCart(prevCart => prevCart.filter(item => item.ticketTypeId !== ticketTypeId));
  };

  const updateQuantity = (ticketTypeId: string, quantity: number) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.ticketTypeId === ticketTypeId ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter(item => item.quantity > 0) // Remove if quantity is 0
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('eventHorizonCart');
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
