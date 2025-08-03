
"use client";

import type { Event, ShowTime, TicketType } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MinusCircle, PlusCircle, AlertTriangle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import * as fpixel from '@/lib/fpixel';

interface TicketSelectorProps {
  event: Event;
  selectedShowTime: ShowTime;
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
    // Effect to update local quantities if cart changes externally OR selectedShowTime changes
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
    const ticketTypeId = ticketTypeForAvailability.id;
    const quantityKey = generateQuantityKey(ticketTypeId, selectedShowTime.id);
    const currentLocalQuantity = quantities[quantityKey] || 0;
    let newQuantity = Math.max(0, currentLocalQuantity + change);

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
            // For addToCart, we need the full TicketType object, not just the Pick.
            // Find it from the event's master list.
            const fullTicketType = event.ticketTypes?.find(tt => tt.id === ticketTypeId);
            if (fullTicketType) {
                addToCart(event, fullTicketType, newQuantity, selectedShowTime.id, selectedShowTime.dateTime);
                fpixel.track('AddToCart', {
                  content_name: event.name,
                  content_ids: [fullTicketType.id],
                  content_type: 'product',
                  value: fullTicketType.price * newQuantity,
                  currency: 'LKR',
                });
                 toast({
                    title: "Added to Cart",
                    description: `${newQuantity} x ${ticketTypeForAvailability.name} for ${event.name} added.`,
                });
            } else {
                // This should ideally not happen if data is consistent
                console.error("Full ticket type definition not found in event for ID:", ticketTypeId);
                toast({ title: "Error", description: "Could not add item to cart. Ticket type details missing.", variant: "destructive"});
            }
        }
    } else { 
        if (cartItem) {
            updateQuantity(ticketTypeId, selectedShowTime.id, 0); // This will filter it out
            toast({
                title: "Removed from Cart",
                description: `${ticketTypeForAvailability.name} for ${event.name} removed.`,
            });
        }
    }
  };

  const currentTotal = selectedShowTime.ticketAvailabilities.reduce((acc, avail) => {
    const quantity = quantities[generateQuantityKey(avail.ticketType.id, selectedShowTime.id)] || 0;
    return acc + (quantity * avail.ticketType.price);
  }, 0);

  if (!selectedShowTime) {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Showtime Not Selected</AlertTitle>
            <AlertDescription>Please select a showtime to see available tickets.</AlertDescription>
        </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select Your Tickets</CardTitle>
        <CardDescription>
            For showtime: {new Date(selectedShowTime.dateTime).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            Your cart will update automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {selectedShowTime.ticketAvailabilities.map((availability) => (
          <div key={availability.ticketType.id} className="p-4 border rounded-lg bg-muted/20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h4 className="font-semibold text-lg">{availability.ticketType.name}</h4>
                <p className="text-sm text-muted-foreground">LKR {availability.ticketType.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each</p>
                {/* Find full description from event.ticketTypes if needed */}
                {/* <p className="text-xs text-muted-foreground mt-1">{event.ticketTypes?.find(tt => tt.id === availability.ticketType.id)?.description}</p> */}
                <p className="text-xs text-primary mt-1 hidden">{availability.availableCount.toLocaleString()} available for this showtime</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(availability.ticketType, availability.availableCount, -1)}
                  disabled={(quantities[generateQuantityKey(availability.ticketType.id, selectedShowTime.id)] || 0) === 0}
                  aria-label={`Decrease quantity for ${availability.ticketType.name}`}
                >
                  <MinusCircle className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  className="w-16 h-10 text-center"
                  value={quantities[generateQuantityKey(availability.ticketType.id, selectedShowTime.id)] || 0}
                  readOnly 
                  aria-label={`Quantity for ${availability.ticketType.name}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(availability.ticketType, availability.availableCount, 1)}
                  disabled={(quantities[generateQuantityKey(availability.ticketType.id, selectedShowTime.id)] || 0) >= availability.availableCount}
                  aria-label={`Increase quantity for ${availability.ticketType.name}`}
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
          Selection Total: LKR {currentTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </CardFooter>
    </Card>
  );
};

export default TicketSelector;
