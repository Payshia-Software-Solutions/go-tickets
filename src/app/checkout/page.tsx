
"use client";

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createBooking } from '@/lib/mockData';
import type { BillingAddress, CartItem } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Trash2, ShoppingCart, Loader2, ShieldCheck } from 'lucide-react';
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
  const [saveNewAddress, setSaveNewAddress] = useState(true); // Default to true when entering new

  const billingForm = useForm<BillingAddress>({
    resolver: zodResolver(BillingAddressSchema),
    defaultValues: defaultBillingValues,
  });

  // Helper to determine if the user has a non-empty saved billing address
  const hasSavedBillingAddress = user && user.billingAddress && Object.values(user.billingAddress).some(v => typeof v === 'string' && v.trim() !== '');

  // Effect 1: Initialize `useDefaultAddress` state when user data loads or changes.
  // This effect primarily decides if the "Use default address" checkbox should be initially checked.
  useEffect(() => {
    if (user) {
      if (hasSavedBillingAddress) {
        setUseDefaultAddress(true);
      } else {
        setUseDefaultAddress(false);
      }
    } else {
      setUseDefaultAddress(false); // No user, so can't use default
    }
  }, [user, hasSavedBillingAddress]); // Re-run if user or their address status changes

  // Effect 2: Update the form content when `useDefaultAddress` state changes, or when user data (and thus potentially the default address) changes.
  useEffect(() => {
    if (useDefaultAddress && hasSavedBillingAddress && user && user.billingAddress) {
      // User wants to use default, and a valid default address exists
      billingForm.reset({
        street: user.billingAddress.street || "",
        city: user.billingAddress.city || "",
        state: user.billingAddress.state || "",
        postalCode: user.billingAddress.postalCode || "",
        country: user.billingAddress.country || "",
      });
    } else {
      // User does not want to use default, or no valid default address exists
      // Clear form for manual input.
      billingForm.reset(defaultBillingValues);
      if (!useDefaultAddress) { // Only manage saveNewAddress if explicitly entering new
          setSaveNewAddress(true); // Default to wanting to save a newly entered address
      }
    }
  }, [useDefaultAddress, user, billingForm, hasSavedBillingAddress]); // React to user, checkbox, and form instance

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Checkout | Event Horizon Tickets';
    }
  }, []);


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

    const billingDataForBooking = (useDefaultAddress && hasSavedBillingAddress && user?.billingAddress)
      ? user.billingAddress
      : formBillingData;

    const finalTotal = totalPrice;

    try {
      // If a new address was entered (not using default) AND the user wants to save it
      // if (!useDefaultAddress && saveNewAddress && user && updateUser) {
      //   const isNewAddressMeaningful = Object.values(formBillingData).some(v => typeof v === 'string' && v.trim() !== '');
      //   if (isNewAddressMeaningful) {
      //       try {
      //       await updateUser(user.id, { billingAddress: formBillingData });
      //       toast({ title: "Billing Address Saved", description: "Your new billing address has been saved to your profile." });
      //       } catch (updateError: unknown) {
      //       console.error("Failed to update user billing address:", updateError);
      //       toast({
      //           title: "Profile Update Failed",
      //           description: (updateError instanceof Error ? updateError.message : "Could not save the new billing address to your profile, but booking will proceed."),
      //           variant: "default" // Changed to default as it's not a critical booking error
      //       });
      //       }
      //   }
      // }
      
      const paymentHtml = await createBooking({
        userId: user.id,
        cart: cart,
        totalPrice: finalTotal,
        billingAddress: billingDataForBooking,
      });

      // Cart is cleared as the user is handed off to the payment gateway.
      // If payment fails, they can return to an empty cart, which is a common pattern.
      clearCart();

      const formContainer = document.createElement('div');
      formContainer.innerHTML = paymentHtml;
      const paymentForm = formContainer.querySelector('form');

      if (paymentForm) {
        document.body.appendChild(paymentForm);
        paymentForm.submit();
        // Do not set isProcessing to false; the page will redirect.
      } else {
        console.error("Payment initiation failed: No form found in the API response.");
        toast({
          title: "Payment Initiation Failed",
          description: "Could not find the payment form in the server's response. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false); // Allow user to try again
      }

    } catch (error: unknown) {
      console.error("Booking/Payment error:", error);
      toast({
        title: "Booking Failed",
        description: (error instanceof Error ? error.message : "Something went wrong. Please try again."),
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };
  
  const isFormReadOnly = useDefaultAddress && hasSavedBillingAddress;

  // Determine if the submit button should be disabled
  const isManualBillingAddressInvalid = !useDefaultAddress && !billingForm.formState.isValid && billingForm.formState.isSubmitted;
  const submitButtonDisabled = !user || isProcessing || cart.length === 0 || isManualBillingAddressInvalid;

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

  const finalTotal = totalPrice;

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
                  {user && hasSavedBillingAddress && (
                    <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/30">
                      <Checkbox
                        id="useDefaultAddress"
                        checked={useDefaultAddress}
                        onCheckedChange={(checked) => setUseDefaultAddress(Boolean(checked))}
                        disabled={!hasSavedBillingAddress} // Should always be enabled if visible
                      />
                      <FormLabel htmlFor="useDefaultAddress" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Use my saved billing address
                      </FormLabel>
                    </div>
                  )}

                  <FormField
                    control={billingForm.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input placeholder="123 Main St" {...field} readOnly={isFormReadOnly} /></FormControl>
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
                          <FormControl><Input placeholder="Anytown" {...field} readOnly={isFormReadOnly} /></FormControl>
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
                          <FormControl><Input placeholder="CA" {...field} readOnly={isFormReadOnly} /></FormControl>
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
                          <FormControl><Input placeholder="90210" {...field} readOnly={isFormReadOnly} /></FormControl>
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
                          <FormControl><Input placeholder="United States" {...field} readOnly={isFormReadOnly} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {user && !useDefaultAddress && ( // Only show if manually entering address
                     <div className="flex items-center space-x-2 pt-4">
                        <Checkbox
                            id="saveNewAddress"
                            checked={saveNewAddress}
                            onCheckedChange={(checked) => setSaveNewAddress(Boolean(checked))}
                        />
                        <FormLabel htmlFor="saveNewAddress" className="text-sm font-medium leading-none">
                            Save this address to my profile for future payments
                        </FormLabel>
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
                        You will be redirected to our secure payment partner to complete your purchase.
                    </p>
                </CardContent>
              </Card>
              {/* Submit button moved to sticky summary card */}
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
                onClick={billingForm.handleSubmit(handleConfirmBooking)} // Trigger form submission here
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
