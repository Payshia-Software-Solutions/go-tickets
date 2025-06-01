
"use client";

import type { Event, TicketType, CartItem } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MinusCircle, PlusCircle, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface TicketSelectorProps {
  event: Event;
}

const TicketSelector: React.FC<TicketSelectorProps> = ({ event }) => {
  const { cart, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  
  // Initialize local quantities based on cart or defaults to 0
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initialQuantities: Record<string, number> = {};
    event.ticketTypes.forEach(tt => {
      const cartItem = cart.find(item => item.ticketTypeId === tt.id && item.eventId === event.id);
      initialQuantities[tt.id] = cartItem ? cartItem.quantity : 0;
    });
    return initialQuantities;
  });

  // Sync local state if cart changes from elsewhere (e.g. page navigation)
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


  const handleQuantityChange = (ticketTypeId: string, change: number) => {
    setQuantities(prev => {
      const currentQuantity = prev[ticketTypeId] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);
      // Find ticket type to check availability
      const ticketType = event.ticketTypes.find(tt => tt.id === ticketTypeId);
      if (ticketType && newQuantity > ticketType.availability) {
         toast({
          title: "Limit Reached",
          description: `Only ${ticketType.availability} tickets available for ${ticketType.name}.`,
          variant: "destructive",
        });
        return { ...prev, [ticketTypeId]: ticketType.availability };
      }
      return { ...prev, [ticketTypeId]: newQuantity };
    });
  };

  const handleAddToCart = (ticketType: TicketType) => {
    const quantity = quantities[ticketType.id] || 0;
    if (quantity > 0) {
      // Check if item is already in cart to decide between addToCart (new item / new quantity logic) vs updateQuantity
      const cartItem = cart.find(item => item.ticketTypeId === ticketType.id && item.eventId === event.id);
      if (cartItem) {
        // If item exists and quantity changed, update it
        if (cartItem.quantity !== quantity) {
          updateQuantity(ticketType.id, quantity);
           toast({
            title: "Cart Updated",
            description: `${quantity} x ${ticketType.name} tickets for ${event.name} in your cart.`,
          });
        } else {
          // No change, do nothing or inform user
        }
      } else {
        // New item for the cart
        addToCart(event, ticketType, quantity);
         toast({
          title: "Added to Cart",
          description: `${quantity} x ${ticketType.name} tickets for ${event.name} added.`,
        });
      }
    } else {
      // If quantity is 0, attempt to remove from cart if it was there
      const cartItem = cart.find(item => item.ticketTypeId === ticketType.id && item.eventId === event.id);
      if (cartItem) {
        updateQuantity(ticketType.id, 0); // This will filter it out in CartContext
         toast({
            title: "Removed from Cart",
            description: `${ticketType.name} tickets for ${event.name} removed.`,
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
        <CardDescription>Choose the number of tickets for each type.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {event.ticketTypes.map((ticketType) => (
          <div key={ticketType.id} className="p-4 border rounded-lg bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h4 className="font-semibold text-lg">{ticketType.name}</h4>
                <p className="text-sm text-muted-foreground">${ticketType.price.toFixed(2)} each</p>
                {ticketType.description && <p className="text-xs text-muted-foreground mt-1">{ticketType.description}</p>}
                <p className="text-xs text-primary mt-1">{ticketType.availability} available</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(ticketType.id, -1)}
                  disabled={(quantities[ticketType.id] || 0) === 0}
                  aria-label={`Decrease quantity for ${ticketType.name}`}
                >
                  <MinusCircle className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  className="w-16 h-10 text-center"
                  value={quantities[ticketType.id] || 0}
                  readOnly // User interacts via buttons
                  aria-label={`Quantity for ${ticketType.name}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(ticketType.id, 1)}
                  disabled={(quantities[ticketType.id] || 0) >= ticketType.availability}
                  aria-label={`Increase quantity for ${ticketType.name}`}
                >
                  <PlusCircle className="h-5 w-5" />
                </Button>
                 <Button 
                    onClick={() => handleAddToCart(ticketType)} 
                    disabled={(quantities[ticketType.id] || 0) === 0 && !cart.find(item => item.ticketTypeId === ticketType.id && item.eventId === event.id)}
                    variant={(quantities[ticketType.id] || 0) > 0 ? "default" : "outline"}
                    className="ml-4"
                  >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {(quantities[ticketType.id] || 0) > 0 ? 'Update Cart' : (cart.find(item => item.ticketTypeId === ticketType.id && item.eventId === event.id) ? 'Remove' : 'Add')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
        <div className="text-xl font-semibold">
          Current Selection Total: ${currentTotal.toFixed(2)}
        </div>
        {/* The "Proceed to Checkout" button is typically on the page using this component, not part of it */}
      </CardFooter>
    </Card>
  );
};

export default TicketSelector;
