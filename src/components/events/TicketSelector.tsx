
"use client";

import type { Event, TicketType, CartItem } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MinusCircle, PlusCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface TicketSelectorProps {
  event: Event;
}

const TicketSelector: React.FC<TicketSelectorProps> = ({ event }) => {
  const { cart, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initialQuantities: Record<string, number> = {};
    event.ticketTypes.forEach(tt => {
      const cartItem = cart.find(item => item.ticketTypeId === tt.id && item.eventId === event.id);
      initialQuantities[tt.id] = cartItem ? cartItem.quantity : 0;
    });
    return initialQuantities;
  });

  useEffect(() => {
    setQuantities(prevQuantities => {
      const newQuantities = { ...prevQuantities };
      let changed = false;
      event.ticketTypes.forEach(tt => {
        const cartItem = cart.find(item => item.ticketTypeId === tt.id && item.eventId === event.id);
        const currentCartQuantity = cartItem ? cartItem.quantity : 0;
        if (newQuantities[tt.id] !== currentCartQuantity) {
          newQuantities[tt.id] = currentCartQuantity;
          changed = true;
        }
      });
      return changed ? newQuantities : prevQuantities;
    });
  }, [cart, event.id, event.ticketTypes]);


  const handleQuantityChange = (ticketType: TicketType, change: number) => {
    const ticketTypeId = ticketType.id;
    const currentLocalQuantity = quantities[ticketTypeId] || 0;
    let newQuantity = Math.max(0, currentLocalQuantity + change);

    if (newQuantity > ticketType.availability) {
        toast({
            title: "Limit Reached",
            description: `Only ${ticketType.availability} tickets available for ${ticketType.name}.`,
            variant: "destructive",
        });
        newQuantity = ticketType.availability; // Cap at availability
    }

    // Update local state first to reflect UI change immediately
    setQuantities(prev => ({ ...prev, [ticketTypeId]: newQuantity }));

    // Now, update the cart context
    const cartItem = cart.find(item => item.ticketTypeId === ticketTypeId && item.eventId === event.id);

    if (newQuantity > 0) {
        if (cartItem) {
            // Item exists, and new quantity is different
            if (cartItem.quantity !== newQuantity) {
                updateQuantity(ticketTypeId, newQuantity);
                toast({
                    title: "Cart Updated",
                    description: `${newQuantity} x ${ticketType.name} for ${event.name} in your cart.`,
                });
            }
        } else {
            // New item for the cart
            addToCart(event, ticketType, newQuantity);
            toast({
                title: "Added to Cart",
                description: `${newQuantity} x ${ticketType.name} for ${event.name} added.`,
            });
        }
    } else { // newQuantity is 0
        if (cartItem) {
            // Item was in cart, now quantity is 0, so remove
            updateQuantity(ticketTypeId, 0); // This will filter it out in CartContext
            toast({
                title: "Removed from Cart",
                description: `${ticketType.name} for ${event.name} removed.`,
            });
        }
    }
  };

  const currentTotal = event.ticketTypes.reduce((acc, tt) => {
    const quantity = quantities[tt.id] || 0;
    return acc + (quantity * tt.price);
  }, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select Your Tickets</CardTitle>
        <CardDescription>Choose the number of tickets for each type. Your cart will update automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {event.ticketTypes.map((ticketType) => (
          <div key={ticketType.id} className="p-4 border rounded-lg bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h4 className="font-semibold text-lg">{ticketType.name}</h4>
                <p className="text-sm text-muted-foreground">LKR {ticketType.price.toFixed(2)} each</p>
                {ticketType.description && <p className="text-xs text-muted-foreground mt-1">{ticketType.description}</p>}
                <p className="text-xs text-primary mt-1">{ticketType.availability} available</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(ticketType, -1)}
                  disabled={(quantities[ticketType.id] || 0) === 0}
                  aria-label={`Decrease quantity for ${ticketType.name}`}
                >
                  <MinusCircle className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  className="w-16 h-10 text-center"
                  value={quantities[ticketType.id] || 0}
                  readOnly 
                  aria-label={`Quantity for ${ticketType.name}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(ticketType, 1)}
                  disabled={(quantities[ticketType.id] || 0) >= ticketType.availability}
                  aria-label={`Increase quantity for ${ticketType.name}`}
                >
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
        <div className="text-xl font-semibold">
          Current Selection Total: LKR {currentTotal.toFixed(2)}
        </div>
      </CardFooter>
    </Card>
  );
};

export default TicketSelector;
