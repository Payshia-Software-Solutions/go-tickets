"use client";

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createBooking } from '@/lib/mockData';
import type { BillingAddress } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShoppingCart, Loader2, ShieldCheck, UserPlus, LogIn, UserCheck,
  ArrowLeft, Trash2, Lock, CreditCard, Ticket, ChevronRight, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import * as fpixel from '@/lib/fpixel';

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(true);

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
      document.title = 'Checkout | GoTickets.lk';
    }
    if (totalItems > 0) {
      fpixel.track('InitiateCheckout', {
        value: totalPrice,
        currency: 'LKR',
        num_items: totalItems
      });
    }
  }, [totalPrice, totalItems]);

  const handleConfirmBooking = async (formBillingData: BillingAddress) => {
    if (cart.length === 0) {
      toast({ title: "Empty Cart", description: "Your cart is empty.", variant: "destructive" });
      return;
    }

    fpixel.track('AddPaymentInfo');
    setIsProcessing(true);

    let finalUserId: string;
    let finalIsGuest = isGuestCheckout;

    if (user) {
      finalUserId = user.id;
    } else if (isGuestCheckout) {
      finalUserId = '1';
    } else {
      toast({
        title: "Action Required",
        description: "Please log in, sign up, or continue as a guest.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    const billingDataForBooking = formBillingData;

    try {
      const paymentHtml = await createBooking({
        userId: finalUserId,
        cart,
        totalPrice: totalPrice,
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
  
  const isBillingFormVisible = user || isGuestCheckout;
  const submitButtonDisabled = isProcessing || cart.length === 0 || !isBillingFormVisible;

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center py-20 bg-slate-50/50 dark:bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-base font-medium text-slate-500">Loading checkout...</p>
      </div>
    );
  }

  if (cart.length === 0 && !isProcessing) {
    return (
      <div className="min-h-[65vh] container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-5">
          <ShoppingCart className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Cart is Empty</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">Looks like you haven&apos;t added any tickets yet.</p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 font-semibold">
          <Link href="/search">Browse Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white py-8 md:py-10">
        <div className="container mx-auto px-4 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-400 mb-2">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-200 font-medium">Checkout</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Complete Your Booking</h1>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-300 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm self-center md:self-auto">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>256-bit Encrypted Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            
            {/* Order Items Review */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Ticket className="h-5 w-5 text-accent" /> Order Summary
                </h2>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {totalItems} Ticket{totalItems !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-4">
                {cart.map(item => (
                  <div
                    key={`${item.eventId}-${item.ticketTypeId}-${item.showTimeId}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-slate-900 dark:text-white text-sm md:text-base truncate">
                        {item.eventName}
                      </p>
                      <p className="text-xs font-medium text-accent mt-0.5">
                        {item.ticketTypeName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.quantity} x LKR {item.pricePerTicket.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm md:text-base">
                        LKR {(item.quantity * item.pricePerTicket).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.ticketTypeId, item.showTimeId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Remove item"
                        suppressHydrationWarning
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Options (If not logged in and not guest yet) */}
            {!user && !isGuestCheckout && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    Select Checkout Option
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose guest checkout for fastest booking or log in to your account.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {/* Option 1: Pay as Guest (Primary / Highlighted) */}
                  <button
                    type="button"
                    onClick={() => setIsGuestCheckout(true)}
                    className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-accent bg-orange-50/50 dark:bg-orange-900/20 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-center sm:text-left transition-all group relative overflow-hidden shadow-sm flex flex-col items-center sm:items-start"
                  >
                    <span className="absolute top-0 right-0 bg-accent text-white text-[8px] sm:text-[10px] font-extrabold px-1.5 sm:px-2.5 py-0.5 rounded-bl-md sm:rounded-bl-lg uppercase tracking-wider">
                      Rec
                    </span>
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-accent text-white inline-block mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-sm">
                      <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-base leading-tight">Pay Guest</p>
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium hidden sm:block">Fastest &amp; Instant · No account needed</p>
                  </button>

                  {/* Option 2: Login */}
                  <button
                    type="button"
                    onClick={() => router.push('/login?redirect=/checkout')}
                    className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-primary hover:bg-blue-50/30 dark:hover:bg-blue-900/10 text-center sm:text-left transition-all group flex flex-col items-center sm:items-start"
                  >
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-900/30 text-primary inline-block mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform">
                      <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight">Login</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">For existing customers</p>
                  </button>

                  {/* Option 3: Sign Up */}
                  <button
                    type="button"
                    onClick={() => router.push('/signup?redirect=/checkout')}
                    className="p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-primary hover:bg-blue-50/30 dark:hover:bg-blue-900/10 text-center sm:text-left transition-all group flex flex-col items-center sm:items-start"
                  >
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 inline-block mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform">
                      <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight">Sign Up</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Create a new account</p>
                  </button>
                </div>
              </div>
            )}

            {/* Billing & Contact Form */}
            {isBillingFormVisible && (
              <Form {...billingForm}>
                <form onSubmit={billingForm.handleSubmit(handleConfirmBooking)} className="space-y-8">
                  <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          Billing &amp; Contact Details
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {isGuestCheckout ? "Provide your contact details for ticket delivery." : "Confirm your billing and contact details."}
                        </p>
                      </div>
                      {isGuestCheckout && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setIsGuestCheckout(false)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                        >
                          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Change Option
                        </Button>
                      )}
                    </div>

                    {user && hasSavedBillingAddress && (
                      <div className="flex items-center space-x-3 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10">
                        <Checkbox
                          id="useDefaultAddress"
                          checked={useDefaultAddress}
                          onCheckedChange={(checked) => setUseDefaultAddress(Boolean(checked))}
                          disabled={!hasSavedBillingAddress}
                        />
                        <FormLabel htmlFor="useDefaultAddress" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                          Use my saved profile billing address
                        </FormLabel>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={billingForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={billingForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={billingForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Email (Ticket Delivery)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={billingForm.control}
                        name="phone_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="0771234567" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                            </FormControl>
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
                          <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">NIC / Passport (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 952345678V" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Billing Address</p>
                      
                      <div className="space-y-4">
                        <FormField
                          control={billingForm.control}
                          name="street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">Street Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main St" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={billingForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Colombo" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={billingForm.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">State / Province</FormLabel>
                                <FormControl>
                                  <Input placeholder="Western" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={billingForm.control}
                            name="postalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">Postal / Zip Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="00300" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={billingForm.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300">Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="Sri Lanka" className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {user && !useDefaultAddress && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="saveNewAddress"
                          checked={saveNewAddress}
                          onCheckedChange={(checked) => setSaveNewAddress(Boolean(checked))}
                        />
                        <FormLabel htmlFor="saveNewAddress" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                          Save this address to my profile for future ticket purchases
                        </FormLabel>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">Payment Redirection</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        You will be redirected to our secure payment gateway partner (Visa, MasterCard, eZ Cash) to complete your transaction safely.
                      </p>
                    </div>
                  </div>
                </form>
              </Form>
            )}

          </div>

          {/* Right Payment Summary Column (Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-6">
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Summary</h2>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    LKR {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Service Fee</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="text-base font-bold text-slate-900 dark:text-white">Total Amount</span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    LKR {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-base shadow-sm"
                onClick={billingForm.handleSubmit(handleConfirmBooking)}
                disabled={submitButtonDisabled}
                suppressHydrationWarning
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" /> Confirm &amp; Pay Now
                  </>
                )}
              </Button>

              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Instant Ticket QR Issued Upon Payment</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
