
"use client";

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createBooking, processMockPayment } from '@/lib/mockData';
import type { BillingAddress } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Trash2, ShoppingCart, Loader2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

const CheckoutPage = () => {
  const { cart, totalPrice, totalItems, clearCart, removeFromCart } = useCart();
  const { user, loading: authLoading, updateUser } = useAuth(); // Added updateUser from useAuth
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const billingForm = useForm<BillingAddress>({
    resolver: zodResolver(BillingAddressSchema),
    defaultValues: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Checkout | Event Horizon Tickets';
    }
  }, []);

  useEffect(() => {
    // Pre-fill form if user has a billing address
    if (user?.billingAddress) {
      billingForm.reset(user.billingAddress);
    } else {
      // If user has no billing address, ensure form is reset to empty (or defaultValues)
      billingForm.reset(billingForm.formState.defaultValues);
    }
  }, [user, billingForm]); // billingForm.reset and billingForm.formState.defaultValues are stable

  const handleConfirmBooking = async (billingData: BillingAddress) => {
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
      toast({ title: "Empty Cart", description: "Your cart is empty.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const primaryEventId = cart[0]?.eventId;
    if (!primaryEventId) {
         toast({ title: "Error", description: "Event ID missing from cart.", variant: "destructive" });
         setIsProcessing(false);
         return;
    }
    const taxes = totalPrice * 0.1; // Mock 10% tax
    const finalTotal = totalPrice + taxes;

    try {
      // Simulate payment
      const paymentResult = await processMockPayment({
        amount: finalTotal,
        billingAddress: billingData,
      });

      if (!paymentResult.success) {
        toast({ title: "Payment Failed", description: paymentResult.message || "Your payment could not be processed.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      toast({ title: "Payment Successful!", description: `Transaction ID: ${paymentResult.transactionId}` });

      // Update user's billing address on their profile
      if (user) {
        try {
          await updateUser(user.id, { billingAddress: billingData });
          toast({ title: "Billing Address Updated", description: "Your billing address has been updated on your profile." });
        } catch (updateError) {
          console.error("Failed to update user billing address:", updateError);
          toast({
            title: "Address Profile Update Failed",
            description: "Could not save the billing address to your profile, but booking will proceed. You can update your address in account settings.",
            variant: "default" // Not destructive, as booking itself might still succeed
          });
        }
      }

      const bookingPayloadForCreateBooking = {
        userId: user.id,
        eventId: primaryEventId, // This should be the actual ID for the event
        tickets: cart.map(item => ({ // Ensure this matches BookedTicketItem structure
            eventNsid: item.eventNsid,
            eventId: item.eventId,
            ticketTypeId: item.ticketTypeId,
            ticketTypeName: item.ticketTypeName,
            quantity: item.quantity,
            pricePerTicket: item.pricePerTicket,
            showTimeId: item.showTimeId,
        })),
        totalPrice: finalTotal, // This is the total with taxes for the booking record
        // Billing address is NOT sent here; it's updated on the user's profile
      };

      const newBooking = await createBooking(bookingPayloadForCreateBooking);

      toast({
        title: "Booking Confirmed!",
        description: `Your booking ID is ${newBooking.id}. Redirecting...`,
      });
      clearCart();
      router.push(`/booking-confirmation/${newBooking.id}`);
    } catch (error: unknown) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: (error instanceof Error ? error.message : "Something went wrong. Please try again."),
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
        <p className="text-muted-foreground mb-6">Looks like you haven&apos;t added any tickets yet.</p>
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
              <CardDescription>Review your selected tickets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.map(item => (
                <div key={`${item.eventId}-${item.ticketTypeId}-${item.showTimeId}`} className="flex justify-between items-start p-3 border rounded-md">
                  <div>
                    <p className="font-semibold">{item.eventName} - {item.ticketTypeName}</p>
                    <p className="text-sm text-muted-foreground">
                      Showtime ID: {item.showTimeId.substring(0,8)}...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x LKR {item.pricePerTicket.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">LKR {(item.quantity * item.pricePerTicket).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.ticketTypeId, item.showTimeId)} aria-label="Remove item" suppressHydrationWarning>
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

          <Form {...billingForm}>
            <form onSubmit={billingForm.handleSubmit(handleConfirmBooking)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Address</CardTitle>
                  <CardDescription>Enter your billing information for this booking. This will update your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={billingForm.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={billingForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl><Input placeholder="Anytown" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={billingForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Province</FormLabel>
                          <FormControl><Input placeholder="CA" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={billingForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal / Zip Code</FormLabel>
                          <FormControl><Input placeholder="90210" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={billingForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl><Input placeholder="United States" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Payment will be handled by our secure payment gateway.
                        You will be redirected to complete your payment after confirming your order details.
                    </p>
                </CardContent>
              </Card>
            </form>
          </Form>
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
                onClick={billingForm.handleSubmit(handleConfirmBooking)}
                disabled={!user || isProcessing || cart.length === 0 || !billingForm.formState.isValid && billingForm.formState.isSubmitted}
                suppressHydrationWarning
              >
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><ShieldCheck className="mr-2 h-4 w-4"/>Confirm & Proceed to Payment</>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
