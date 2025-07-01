
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
import { createBooking, createUser as apiCreateUser, getUserByEmail } from '@/lib/mockData';
import type { BillingAddress, CartItem } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Trash2, ShoppingCart, Loader2, ShieldCheck, UserPlus, LogIn, UserCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const defaultBillingValues: BillingAddress = {
  firstName: "",
  lastName: "",
  email: "",
  phone_number: "",
  nic: "",
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
  const [saveNewAddress, setSaveNewAddress] = useState(true);

  // New state for guest checkout flow
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);

  const billingForm = useForm<BillingAddress>({
    resolver: zodResolver(BillingAddressSchema),
    defaultValues: defaultBillingValues,
  });

  const hasSavedBillingAddress = user && user.billingAddress && Object.values(user.billingAddress).some(v => typeof v === 'string' && v.trim() !== '');

  useEffect(() => {
    if (user) {
      if (hasSavedBillingAddress) {
        setUseDefaultAddress(true);
      } else {
        setUseDefaultAddress(false);
      }
    } else {
      setUseDefaultAddress(false);
    }
  }, [user, hasSavedBillingAddress]);

  useEffect(() => {
    const [firstName = '', ...lastNameParts] = (user?.name || "").split(" ");
    const lastName = lastNameParts.join(" ");

    if (useDefaultAddress && hasSavedBillingAddress && user?.billingAddress) {
      billingForm.reset({
        firstName: firstName,
        lastName: lastName,
        email: user.email || "",
        phone_number: user.phoneNumber || "",
        nic: user.billingAddress.nic || "",
        street: user.billingAddress.street || "",
        city: user.billingAddress.city || "",
        state: user.billingAddress.state || "",
        postalCode: user.billingAddress.postalCode || "",
        country: user.billingAddress.country || "",
      });
    } else {
      billingForm.reset({
        firstName: user ? firstName : "",
        lastName: user ? lastName : "",
        email: user?.email || "",
        phone_number: user?.phoneNumber || "",
        nic: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      });
      if (!useDefaultAddress) {
          setSaveNewAddress(true);
      }
    }
  }, [useDefaultAddress, user, billingForm, hasSavedBillingAddress]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Checkout | Event Horizon Tickets';
    }
  }, []);

  const handleConfirmBooking = async (formBillingData: BillingAddress) => {
    if (cart.length === 0) {
      toast({ title: "Empty Cart", description: "Your cart is empty.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    let finalUserId: string;
    let finalIsGuest = isGuestCheckout;

    if (user) {
      finalUserId = user.id;
    } else if (isGuestCheckout) {
      const guestEmail = formBillingData.email.toLowerCase();
      const existingUser = await getUserByEmail(guestEmail);
      if (existingUser) {
        toast({
          title: "Account Exists",
          description: "An account with this email already exists. Please log in to continue.",
          variant: "destructive",
          action: <Button onClick={() => { setIsGuestCheckout(false); router.push('/login?redirect=/checkout'); }}>Login</Button>
        });
        setIsProcessing(false);
        return;
      }

      try {
        const guestPassword = `guest-${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
        const newGuestUser = await apiCreateUser({
          name: `${formBillingData.firstName} ${formBillingData.lastName}`,
          email: guestEmail,
          password: guestPassword,
          confirmPassword: guestPassword,
          phone_number: formBillingData.phone_number,
          billing_street: formBillingData.street,
          billing_city: formBillingData.city,
          billing_state: formBillingData.state,
          billing_postal_code: formBillingData.postalCode,
          billing_country: formBillingData.country,
        });
        finalUserId = newGuestUser.id;
      } catch (error) {
        console.error("Guest user creation failed:", error);
        toast({
          title: "Guest Checkout Failed",
          description: error instanceof Error ? error.message : "Could not create a temporary guest account.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
    } else {
      toast({
        title: "Action Required",
        description: "Please log in, sign up, or continue as a guest.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    let billingDataForBooking: BillingAddress;

    if (user && useDefaultAddress && hasSavedBillingAddress && user.billingAddress) {
        const [firstName = '', ...lastNameParts] = (user.name || "").split(" ");
        const lastName = lastNameParts.join(" ");

        billingDataForBooking = {
            ...defaultBillingValues,
            ...user.billingAddress,
            firstName,
            lastName,
            email: user.email || '',
            phone_number: user.phoneNumber || '',
        };
    } else {
        billingDataForBooking = formBillingData;
    }

    try {
      const paymentHtml = await createBooking({
        userId: finalUserId,
        cart,
        totalPrice,
        billingAddress: billingDataForBooking,
        isGuest: finalIsGuest
      });

      clearCart();

      const formContainer = document.createElement('div');
      formContainer.innerHTML = paymentHtml;
      const paymentForm = formContainer.querySelector('form');

      if (paymentForm) {
        document.body.appendChild(paymentForm);
        paymentForm.submit();
      } else {
        throw new Error("Payment initiation failed: No form found in the API response.");
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
  const isBillingFormVisible = user || isGuestCheckout;
  const submitButtonDisabled = isProcessing || cart.length === 0 || !isBillingFormVisible;

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

          {!user && !isGuestCheckout && (
            <Card>
              <CardHeader>
                <CardTitle>How would you like to proceed?</CardTitle>
                <CardDescription>Log in for a faster experience or continue as a guest.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-full flex flex-col p-4 gap-2" onClick={() => router.push('/login?redirect=/checkout')}>
                  <LogIn className="h-6 w-6"/>
                  <span className="text-base">Login</span>
                  <span className="text-xs font-normal text-muted-foreground">For existing customers</span>
                </Button>
                <Button variant="outline" className="h-full flex flex-col p-4 gap-2" onClick={() => router.push('/signup?redirect=/checkout')}>
                  <UserPlus className="h-6 w-6"/>
                  <span className="text-base">Sign Up</span>
                  <span className="text-xs font-normal text-muted-foreground">Create a new account</span>
                </Button>
                 <Button variant="secondary" className="h-full flex flex-col p-4 gap-2" onClick={() => setIsGuestCheckout(true)}>
                  <UserCheck className="h-6 w-6"/>
                  <span className="text-base">Pay as Guest</span>
                  <span className="text-xs font-normal text-muted-foreground">No account needed</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {isBillingFormVisible && (
            <Form {...billingForm}>
              <form onSubmit={billingForm.handleSubmit(handleConfirmBooking)} className="space-y-6">
                <Card>
                  <CardHeader>
                     <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Billing & Contact Information</CardTitle>
                            <CardDescription>{isGuestCheckout ? "Please provide your details for this booking." : "Confirm your billing and contact details."}</CardDescription>
                        </div>
                        {isGuestCheckout && (
                            <Button variant="outline" type="button" onClick={() => setIsGuestCheckout(false)}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user && hasSavedBillingAddress && (
                      <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/30">
                        <Checkbox
                          id="useDefaultAddress"
                          checked={useDefaultAddress}
                          onCheckedChange={(checked) => setUseDefaultAddress(Boolean(checked))}
                          disabled={!hasSavedBillingAddress}
                        />
                        <FormLabel htmlFor="useDefaultAddress" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Use my saved billing address
                        </FormLabel>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={billingForm.control}
                            name="firstName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl><Input placeholder="John" {...field} readOnly={isFormReadOnly} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={billingForm.control}
                            name="lastName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl><Input placeholder="Doe" {...field} readOnly={isFormReadOnly} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={billingForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl><Input type="email" placeholder="you@example.com" {...field} readOnly={isFormReadOnly && !!user?.billingAddress?.email} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={billingForm.control}
                        name="phone_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone Number</FormLabel>
                            <FormControl><Input type="tel" placeholder="0771234567" {...field} readOnly={isFormReadOnly && !!user?.billingAddress?.phone_number} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                        control={billingForm.control}
                        name="nic"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>NIC (Optional)</FormLabel>
                            <FormControl><Input placeholder="e.g., 952345678V" {...field} readOnly={isFormReadOnly} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <Separator className="!my-6"/>

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

                    {user && !useDefaultAddress && (
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
              </form>
            </Form>
          )}
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
