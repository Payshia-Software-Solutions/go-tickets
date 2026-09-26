"use client";

import type { Event, ShowTime, TicketType } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, AlertTriangle, Ticket, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import * as fpixel from '@/lib/fpixel';

interface TicketSelectorProps {
  event: Event;
  selectedShowTime: ShowTime | null;
}

const TicketSelector: React.FC<TicketSelectorProps> = ({ event, selectedShowTime }) => {
  const { cart, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  
  const generateQuantityKey = (ticketTypeId: string, showTimeId: string) => `${ticketTypeId}-${showTimeId}`;

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initialQuantities: Record<string, number> = {};
    if (selectedShowTime?.ticketAvailabilities) {
      selectedShowTime.ticketAvailabilities.forEach(avail => {
        const cartItem = cart.find(
          item => item.ticketTypeId === avail.ticketType.id && 
                  item.eventId === event.id && 
                  item.showTimeId === selectedShowTime.id
        );
        initialQuantities[generateQuantityKey(avail.ticketType.id, selectedShowTime.id)] = cartItem ? cartItem.quantity : 0;
      });
    }
    return initialQuantities;
  });

  useEffect(() => {
    const newQuantities: Record<string, number> = {};
    let changed = false;
    if (selectedShowTime?.ticketAvailabilities) {
      selectedShowTime.ticketAvailabilities.forEach(avail => {
        const key = generateQuantityKey(avail.ticketType.id, selectedShowTime.id);
        const cartItem = cart.find(
          item => item.ticketTypeId === avail.ticketType.id && 
                  item.eventId === event.id && 
                  item.showTimeId === selectedShowTime.id
        );
        const currentCartQuantity = cartItem ? cartItem.quantity : 0;
        if (quantities[key] !== currentCartQuantity) {
          changed = true;
        }
        newQuantities[key] = currentCartQuantity;
      });
    }
    if (changed || Object.keys(quantities).length !== Object.keys(newQuantities).length) {
      setQuantities(newQuantities);
    }
  }, [cart, event.id, selectedShowTime, quantities]);

  const handleQuantityChange = (
    ticketTypeForAvailability: Pick<TicketType, 'id' | 'name' | 'price'>, 
    maxAvailability: number, 
    change: number
  ) => {
    if (!selectedShowTime) return;
    const ticketTypeId = ticketTypeForAvailability.id;
    const quantityKey = generateQuantityKey(ticketTypeId, selectedShowTime.id);
    const currentLocalQuantity = quantities[quantityKey] || 0;
    let newQuantity = Math.max(0, currentLocalQuantity + change);
    const price = ticketTypeForAvailability.price;

    if (newQuantity > maxAvailability) {
        toast({
            title: "Limit Reached",
            description: `Only ${maxAvailability} tickets available for ${ticketTypeForAvailability.name} for this showtime.`,
            variant: "destructive",
        });
        newQuantity = maxAvailability;
    }

    setQuantities(prev => ({ ...prev, [quantityKey]: newQuantity }));

    const cartItem = cart.find(
        item => item.ticketTypeId === ticketTypeId && 
                item.eventId === event.id && 
                item.showTimeId === selectedShowTime.id
    );

    if (newQuantity > 0) {
        if (cartItem) {
            if (cartItem.quantity !== newQuantity) {
                updateQuantity(ticketTypeId, selectedShowTime.id, newQuantity);
                toast({
                    title: "Cart Updated",
                    description: `${newQuantity} x ${ticketTypeForAvailability.name} for ${event.name} in your cart.`,
                });
            }
        } else {
            const fullTicketType = event.ticketTypes?.find(tt => tt.id === ticketTypeId);
            if (fullTicketType) {
                addToCart(event, fullTicketType, newQuantity, selectedShowTime.id, selectedShowTime.dateTime);
                fpixel.track('AddToCart', {
                  content_name: event.name,
                  content_ids: [fullTicketType.id],
                  content_type: 'product',
                  value: price * newQuantity,
                  currency: 'LKR',
                });
                 toast({
                    title: "Added to Cart",
                    description: `${newQuantity} x ${ticketTypeForAvailability.name} for ${event.name} added.`,
                });
            } else {
                console.error("Full ticket type definition not found in event for ID:", ticketTypeId);
                toast({ title: "Error", description: "Could not add item to cart. Ticket type details missing.", variant: "destructive"});
            }
        }
    } else { 
        if (cartItem) {
            updateQuantity(ticketTypeId, selectedShowTime.id, 0);
            toast({
                title: "Removed from Cart",
                description: `${ticketTypeForAvailability.name} for ${event.name} removed.`,
            });
        }
    }
  };

  if (!selectedShowTime) {
    return (
        <Alert variant="destructive" className="rounded-2xl border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Showtime Not Selected</AlertTitle>
            <AlertDescription>Please select a showtime to see available tickets.</AlertDescription>
        </Alert>
    );
  }

  const currentTotal = selectedShowTime.ticketAvailabilities.reduce((acc, avail) => {
    const quantity = quantities[generateQuantityKey(avail.ticketType.id, selectedShowTime.id)] || 0;
    const price = avail.ticketType.price;
    return acc + (quantity * price);
  }, 0);

  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-xl">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select Your Tickets</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose the number of tickets you wish to purchase.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {selectedShowTime.ticketAvailabilities.map((availability) => {
          const price = availability.ticketType.price;
          const currentQty = quantities[generateQuantityKey(availability.ticketType.id, selectedShowTime.id)] || 0;

          return (
            <div
              key={availability.ticketType.id}
              className={`p-5 rounded-2xl border transition-all duration-200 ${
                currentQty > 0
                  ? 'bg-blue-50/50 dark:bg-blue-900/10 border-primary/40 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {availability.ticketType.name}
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      LKR {price.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </p>
                    <span className="text-xs text-slate-400">per ticket</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(availability.ticketType, availability.availableCount, -1)}
                    disabled={currentQty === 0}
                    aria-label={`Decrease quantity for ${availability.ticketType.name}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-slate-900 dark:text-white">
                    {currentQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(availability.ticketType, availability.availableCount, 1)}
                    disabled={currentQty >= availability.availableCount}
                    aria-label={`Increase quantity for ${availability.ticketType.name}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Amount</span>
        <span className="text-xl font-extrabold text-slate-900 dark:text-white">
          LKR {currentTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
};

export default TicketSelector;
