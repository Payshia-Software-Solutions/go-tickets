
"use client";

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createBooking } from '@/lib/mockData'; 
import type { Event } from '@/lib/types';
import { useEffect, useState } from 'react';
import { AlertCircle, Trash2, ShoppingCart, Loader2 } from 'lucide-react'; // Added Loader2
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

const CheckoutPage = () => {
  const { cart, totalPrice, totalItems, clearCart, removeFromCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  // No longer need eventDetailsCache as cart items should have sufficient info, 
  // and createBooking now takes eventId directly.

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Checkout | MyPass.lk';
    }
  }, []);

  const handleConfirmBooking = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to complete your booking.",
        variant: "destructive",
        action: <Button onClick={() => router.push('/login?redirect=/checkout')}>Login</Button>
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add some tickets.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    // createBooking now primarily needs eventId and showTimeId from the cart items.
    // Assuming all items in the cart are for the same event (a common cart behavior).
    // If cart can contain multiple events, this needs more complex handling (e.g., separate bookings).
    const primaryEventId = cart[0]?.eventId; 
    if (!primaryEventId) {
         toast({ title: "Error", description: "Event ID missing from cart. Cannot proceed.", variant: "destructive" });
         setIsProcessing(false);
         return;
    }

    try {
      // The `tickets` array for createBooking is directly derived from cart items
      const bookingPayload = {
        eventId: primaryEventId,
        userId: user.id,
        tickets: cart.map(item => ({ 
            eventNsid: item.eventNsid,
            ticketTypeId: item.ticketTypeId, 
            ticketTypeName: item.ticketTypeName, 
            quantity: item.quantity,
            pricePerTicket: item.pricePerTicket,
            showTimeId: item.showTimeId, // Pass the showTimeId
        })),
        totalPrice,
      };

      const newBooking = await createBooking(bookingPayload);
      
      toast({
        title: "Booking Confirmed!",
        description: `Your booking ID is ${newBooking.id}. Redirecting...`,
      });
      clearCart();
      router.push(`/booking-confirmation/${newBooking.id}`);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (authLoading) {
    return (
        <div className="container mx-auto py-12 text-center flex justify-center items-center min-h-[calc(100vh-15rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading checkout...</p>
        </div>
    );
  }

  if (cart.length === 0 && !isProcessing) { 
    return (
      <div className="container mx-auto py-12 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Your Cart is Empty</h2>
        <p className="text-muted-foreground mb-6">Looks like you haven't added any tickets yet.</p>
        <Button asChild>
          <Link href="/search">Browse Events</Link>
        </Button>
      </div>
    );
  }

  const taxes = totalPrice * 0.1; // Mock 10% tax
  const finalTotal = totalPrice + taxes;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold font-headline mb-8 text-center">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Review your selected tickets before payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.map(item => (
                <div key={`${item.eventId}-${item.ticketTypeId}-${item.showTimeId}`} className="flex justify-between items-start p-3 border rounded-md">
                  <div>
                    <p className="font-semibold">{item.eventName} - {item.ticketTypeName}</p>
                    <p className="text-sm text-muted-foreground">
                      Showtime ID: {item.showTimeId.substring(0,8)}... {/* Display part of showtime ID for differentiation */}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x LKR {item.pricePerTicket.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">LKR {(item.quantity * item.pricePerTicket).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.ticketTypeId, item.showTimeId)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <p>Subtotal</p>
                <p>LKR {totalPrice.toFixed(2)}</p>
              </div>
              <div className="flex justify-between">
                <p>Taxes (Mock 10%)</p>
                <p>LKR {taxes.toFixed(2)}</p>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <p>Total</p>
                <p>LKR {finalTotal.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {!user && (
            <Alert variant="default" className="bg-primary/10 border-primary/50">
              <AlertCircle className="h-4 w-4 !text-primary" />
              <AlertTitle className="text-primary">Account Required</AlertTitle>
              <AlertDescription>
                Please <Link href="/login?redirect=/checkout" className="font-semibold underline hover:text-accent">login</Link> or <Link href="/signup?redirect=/checkout" className="font-semibold underline hover:text-accent">create an account</Link> to complete your purchase.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment Details (Mock)</CardTitle>
              <CardDescription>This is a simulated payment process.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" placeholder="**** **** **** ****" disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input id="expiryDate" placeholder="MM/YY" disabled />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="***" disabled />
                </div>
              </div>
              <div>
                <Label htmlFor="cardName">Name on Card</Label>
                <Input id="cardName" placeholder="John Doe" disabled />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Ready to Book?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between font-bold text-xl">
                <span>Total:</span>
                <span>LKR {finalTotal.toFixed(2)}</span>
              </div>
              <p className="text-sm text-muted-foreground">You have {totalItems} item(s) in your cart.</p>
            </CardContent>
            <CardFooter>
              <Button 
                size="lg" 
                className="w-full" 
                onClick={handleConfirmBooking} 
                disabled={!user || isProcessing || cart.length === 0}
              >
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Confirm & Pay (Mock)'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
