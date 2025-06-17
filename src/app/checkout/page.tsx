
"use client";

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createBooking, processMockPayment } from '@/lib/mockData';
import type { BillingAddress } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Trash2, ShoppingCart, Loader2, ShieldCheck, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

const defaultBillingValues: BillingAddress = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const CheckoutPage = () => {
  const { cart, totalPrice, totalItems, clearCart, removeFromCart } = useCart();
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(true); // Default to true if entering new


  const billingForm = useForm<BillingAddress>({
    resolver: zodResolver(BillingAddressSchema),
    defaultValues: defaultBillingValues,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Checkout | GoTickets.lk';
    }
  }, []);

  // Effect to initialize form and `useDefaultAddress` based on `user`
  useEffect(() => {
    if (user) {
      if (user.billingAddress && Object.values(user.billingAddress).some(v => v)) { // Check if address is not all empty strings
        setUseDefaultAddress(true);
        billingForm.reset({
          street: user.billingAddress.street || "",
          city: user.billingAddress.city || "",
          state: user.billingAddress.state || "",
          postalCode: user.billingAddress.postalCode || "",
          country: user.billingAddress.country || "",
        });
      } else {
        setUseDefaultAddress(false);
        billingForm.reset(defaultBillingValues);
      }
    } else {
      // No user, ensure form is clear and default address is not used
      setUseDefaultAddress(false);
      billingForm.reset(defaultBillingValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Depend on user to re-evaluate

  // Effect to sync form when `useDefaultAddress` changes or user data updates
  useEffect(() => {
    if (useDefaultAddress) {
      if (user && user.billingAddress && Object.values(user.billingAddress).some(v => v)) {
        billingForm.reset({
          street: user.billingAddress.street || "",
          city: user.billingAddress.city || "",
          state: user.billingAddress.state || "",
          postalCode: user.billingAddress.postalCode || "",
          country: user.billingAddress.country || "",
        });
      } else {
        // This case implies user.billingAddress is null/empty, so "use default" shouldn't be possible
        // but as a fallback, clear form.
        setUseDefaultAddress(false); // Cannot use default if no default exists
        billingForm.reset(defaultBillingValues);
      }
    } else {
      // When switching to manual entry, clear the form
      // Only clear if the form wasn't already being manually edited for a new address
      // Check if current form values are different from defaultBillingValues, indicating manual input in progress
      const currentFormValues = billingForm.getValues();
      const isManuallyEditing = JSON.stringify(currentFormValues) !== JSON.stringify(defaultBillingValues);
      if (!isManuallyEditing && (!user || !user.billingAddress || JSON.stringify(currentFormValues) === JSON.stringify(user.billingAddress))) {
         billingForm.reset(defaultBillingValues);
      }
      setSaveNewAddress(true); // Default to saving a newly entered address
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDefaultAddress, user]); // Depend on user as well for re-sync if user logs in/out

  const handleConfirmBooking = async (formBillingData: BillingAddress) => {
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

    const billingDataForBooking = useDefaultAddress && user?.billingAddress ? user.billingAddress : formBillingData;

    const primaryEventId = cart[0]?.eventId;
    if (!primaryEventId) {
         toast({ title: "Error", description: "Event ID missing from cart.", variant: "destructive" });
         setIsProcessing(false);
         return;
    }
    const taxes = totalPrice * 0.1; 
    const finalTotal = totalPrice + taxes;

    try {
      const paymentResult = await processMockPayment({
        amount: finalTotal,
        billingAddress: billingDataForBooking,
      });

      if (!paymentResult.success) {
        toast({ title: "Payment Failed", description: paymentResult.message || "Your payment could not be processed.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      toast({ title: "Payment Successful!", description: `Transaction ID: ${paymentResult.transactionId}` });

      // Update user's billing address on their profile IF they entered a new one AND chose to save it
      if (!useDefaultAddress && saveNewAddress && user && updateUser) {
        try {
          await updateUser(user.id, { billingAddress: formBillingData });
          toast({ title: "Billing Address Saved", description: "Your new billing address has been saved to your profile." });
        } catch (updateError) {
          console.error("Failed to update user billing address:", updateError);
          toast({
            title: "Profile Update Failed",
            description: "Could not save the new billing address to your profile, but booking will proceed.",
            variant: "default" 
          });
        }
      }

      const bookingPayloadForCreateBooking = {
        userId: user.id,
        eventId: primaryEventId,
        tickets: cart.map(item => ({
            eventNsid: item.eventNsid,
            eventId: item.eventId,
            ticketTypeId: item.ticketTypeId,
            ticketTypeName: item.ticketTypeName,
            quantity: item.quantity,
            pricePerTicket: item.pricePerTicket,
            showTimeId: item.showTimeId,
        })),
        totalPrice: finalTotal,
        billingAddress: billingDataForBooking, // This is passed for record-keeping / payment, not to save directly on booking table
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
  
  const canUseDefaultAddress = !!(user && user.billingAddress && Object.values(user.billingAddress).some(v => v));

  const submitButtonDisabled = !user || isProcessing || cart.length === 0 || 
                              (!useDefaultAddress && !billingForm.formState.isValid && billingForm.formState.isSubmitted);


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

  const taxes = totalPrice * 0.1;
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
                  <CardDescription>Enter your billing information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user && canUseDefaultAddress && (
                    <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/30">
                      <Checkbox
                        id="useDefaultAddress"
                        checked={useDefaultAddress}
                        onCheckedChange={(checked) => setUseDefaultAddress(Boolean(checked))}
                        disabled={!canUseDefaultAddress}
                      />
                      <Label htmlFor="useDefaultAddress" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Use my saved billing address
                      </Label>
                    </div>
                  )}

                  <FormField
                    control={billingForm.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input placeholder="123 Main St" {...field} readOnly={useDefaultAddress && canUseDefaultAddress} /></FormControl>
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
                          <FormControl><Input placeholder="Anytown" {...field} readOnly={useDefaultAddress && canUseDefaultAddress} /></FormControl>
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
                          <FormControl><Input placeholder="CA" {...field} readOnly={useDefaultAddress && canUseDefaultAddress} /></FormControl>
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
                          <FormControl><Input placeholder="90210" {...field} readOnly={useDefaultAddress && canUseDefaultAddress} /></FormControl>
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
                          <FormControl><Input placeholder="United States" {...field} readOnly={useDefaultAddress && canUseDefaultAddress} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {user && !useDefaultAddress && (
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox
                            id="saveNewAddress"
                            checked={saveNewAddress}
                            onCheckedChange={(checked) => setSaveNewAddress(Boolean(checked))}
                        />
                        <Label htmlFor="saveNewAddress" className="text-sm font-medium leading-none">
                            Save this address to my profile for future payments
                        </Label>
                     </div>
                  )}
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
                    {/* Actual payment fields would go here in a real app */}
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
                disabled={submitButtonDisabled}
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
