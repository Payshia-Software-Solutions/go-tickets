"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, ArrowLeft, Ticket, CalendarDays, User, MapPin, 
  CheckCircle, MinusCircle, PlusCircle, CreditCard, UploadCloud, 
  FileText, X, AlertCircle, Banknote, DollarSign 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminGetAllEvents, getAdminEventById, createBooking } from '@/lib/mockData';
import { uploadPaymentSlip } from '@/lib/services/booking.service';
import type { Event, BillingAddress, CartItem } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function AdminNewBookingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentAdmin } = useAuth();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string | null>(null);
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});

  // Payment Tracking State
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [paymentStatusMode, setPaymentStatusMode] = useState<'paid' | 'partially_paid' | 'pending'>('paid');
  const [customAmountPaid, setCustomAmountPaid] = useState<string>('');
  const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);
  const [paymentSlipPreview, setPaymentSlipPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const billingForm = useForm<BillingAddress>({
    resolver: zodResolver(BillingAddressSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone_number: "",
      nic: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Sri Lanka",
    },
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const allEvents = await adminGetAllEvents();
        setEvents(allEvents);
      } catch (e) {
        toast({ title: "Error", description: "Failed to load events.", variant: "destructive" });
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchEvents();
  }, [toast]);

  useEffect(() => {
    if (selectedEventId) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        setSelectedShowtimeId(null);
        setTicketQuantities({});
        try {
          const details = await getAdminEventById(selectedEventId);
          setEventDetails(details || null);
          if (details?.showTimes?.length === 1) {
              setSelectedShowtimeId(details.showTimes[0].id);
          }
        } catch (e) {
          toast({ title: "Error", description: "Failed to load event details.", variant: "destructive" });
        } finally {
          setIsLoadingDetails(false);
        }
      };
      fetchDetails();
    }
  }, [selectedEventId, toast]);

  const selectedShowtime = useMemo(() => {
    return eventDetails?.showTimes?.find(st => st.id === selectedShowtimeId);
  }, [eventDetails, selectedShowtimeId]);

  const handleQuantityChange = (ticketTypeId: string, change: number, max: number) => {
    const current = ticketQuantities[ticketTypeId] || 0;
    const next = Math.max(0, Math.min(max, current + change));
    setTicketQuantities(prev => ({ ...prev, [ticketTypeId]: next }));
  };

  const totalPrice = useMemo(() => {
    if (!selectedShowtime) return 0;
    return selectedShowtime.ticketAvailabilities.reduce((sum, avail) => {
      const qty = ticketQuantities[avail.ticketType.id] || 0;
      return sum + (qty * avail.ticketType.price);
    }, 0);
  }, [selectedShowtime, ticketQuantities]);

  // Payment amounts calculation
  const effectivePaidAmount = useMemo(() => {
    if (paymentStatusMode === 'paid') return totalPrice;
    if (paymentStatusMode === 'pending') return 0;
    const parsed = parseFloat(customAmountPaid);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(totalPrice, parsed));
  }, [paymentStatusMode, customAmountPaid, totalPrice]);

  const balanceDue = useMemo(() => {
    return Math.max(0, totalPrice - effectivePaidAmount);
  }, [totalPrice, effectivePaidAmount]);

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setPaymentSlipFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPaymentSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPaymentSlipPreview(null);
    }
  };

  const clearSlip = () => {
    setPaymentSlipFile(null);
    setPaymentSlipPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (billingData: BillingAddress) => {
    if (!eventDetails || !selectedShowtime) return;
    
    const cart: CartItem[] = selectedShowtime.ticketAvailabilities
      .filter(avail => ticketQuantities[avail.ticketType.id] > 0)
      .map(avail => ({
        eventId: eventDetails.id,
        eventNsid: eventDetails.slug,
        eventName: eventDetails.name,
        ticketTypeId: avail.ticketType.id,
        ticketTypeName: avail.ticketType.name,
        quantity: ticketQuantities[avail.ticketType.id],
        pricePerTicket: avail.ticketType.price,
        showTimeId: selectedShowtime.id,
        showTimeDateTime: selectedShowtime.dateTime,
      }));

    if (cart.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one ticket.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedSlipUrl: string | null = null;
      if (paymentSlipFile) {
        toast({ title: "Uploading Slip", description: "Uploading payment slip receipt to server..." });
        const uploadResult = await uploadPaymentSlip(paymentSlipFile);
        uploadedSlipUrl = uploadResult.filePath;
      }

      const paymentStatusValue = 
        paymentStatusMode === 'paid' ? 'Paid' : 
        (paymentStatusMode === 'partially_paid' ? 'Partially Paid' : 'pending');

      const responseText = await createBooking({
        userId: currentAdmin?.id || '1',
        cart,
        totalPrice,
        billingAddress: billingData,
        isGuest: true,
        booked_type: 'manualy',
        payment_status: paymentStatusValue,
        amount_paid: effectivePaidAmount,
        balance_amount: balanceDue,
        payment_method: paymentMethod,
        payment_slip: uploadedSlipUrl,
        payment_notes: paymentNotes || (paymentReference ? `Ref: ${paymentReference}` : undefined),
      });

      let bookingId = '';
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.booking_id) {
          bookingId = String(parsed.booking_id);
        } else if (parsed.booking?.id) {
          bookingId = String(parsed.booking.id);
        }
      } catch (e) {
        // Fallback if not direct json
      }

      toast({ 
        title: "Manual Booking Created!", 
        description: `Booking successfully created with ${paymentStatusValue} status.` 
      });

      if (bookingId) {
        router.push(`/admin/bookings/${bookingId}`);
      } else {
        router.push('/admin/bookings');
      }
    } catch (error) {
      console.error("Failed to create manual booking:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create booking.", 
        variant: "destructive" 
      });
      setIsSubmitting(false);
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
        </Button>
        <h1 className="text-3xl font-bold font-headline mt-4">New Manual Booking</h1>
        <p className="text-muted-foreground">Issue offline / direct bookings with payment record & slip tracking.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Step 1: Select Event */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Ticket className="mr-2 h-5 w-5 text-primary"/> 1. Select Event & Showtime
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {isLoadingDetails && <div className="flex justify-center py-4"><Loader2 className="animate-spin h-6 w-6"/></div>}

              {eventDetails && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label>Showtime</Label>
                    <Select value={selectedShowtimeId || ""} onValueChange={setSelectedShowtimeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a showtime..." />
                      </SelectTrigger>
                      <SelectContent>
                        {eventDetails.showTimes?.map(st => (
                          <SelectItem key={st.id} value={st.id}>{format(new Date(st.dateTime), 'PPp')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedShowtime && (
                    <div className="space-y-3 pt-4">
                      <Label>Ticket Quantities</Label>
                      {selectedShowtime.ticketAvailabilities.map(avail => (
                        <div key={avail.ticketType.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                          <div>
                            <p className="font-medium">{avail.ticketType.name}</p>
                            <p className="text-sm text-muted-foreground">LKR {avail.ticketType.price.toLocaleString()} ({avail.availableCount} left)</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => handleQuantityChange(avail.ticketType.id, -1, avail.availableCount)}
                              disabled={!ticketQuantities[avail.ticketType.id]}
                            >
                              <MinusCircle className="h-4 w-4"/>
                            </Button>
                            <span className="w-8 text-center font-bold">{ticketQuantities[avail.ticketType.id] || 0}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => handleQuantityChange(avail.ticketType.id, 1, avail.availableCount)}
                              disabled={(ticketQuantities[avail.ticketType.id] || 0) >= avail.availableCount}
                            >
                              <PlusCircle className="h-4 w-4"/>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Attendee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="mr-2 h-5 w-5 text-primary"/> 2. Attendee & Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...billingForm}>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="customer@example.com" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="phone_number" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="0771234567" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                  </div>
                  
                  <FormField control={billingForm.control} name="nic" render={({ field }) => (
                    <FormItem><FormLabel>NIC (Optional)</FormLabel><FormControl><Input placeholder="e.g., 952345678V" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>

                  <Separator />

                  <FormField control={billingForm.control} name="street" render={({ field }) => (
                    <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="city" render={({ field }) => (
                      <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Colombo" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input placeholder="Western" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="postalCode" render={({ field }) => (
                      <FormItem><FormLabel>Postal / Zip Code</FormLabel><FormControl><Input placeholder="00100" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="country" render={({ field }) => (
                      <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="Sri Lanka" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Step 3: Payment Record & Slip */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-primary"/> 3. Payment Record & Slip Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Payment Status</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusMode('paid');
                      setCustomAmountPaid('');
                    }}
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                      paymentStatusMode === 'paid'
                        ? 'border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 ring-2 ring-green-600/20'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-semibold">Full Payment</div>
                    <div className="text-xs text-muted-foreground mt-0.5">100% Paid</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusMode('partially_paid');
                      if (!customAmountPaid && totalPrice > 0) {
                        setCustomAmountPaid((totalPrice / 2).toString());
                      }
                    }}
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                      paymentStatusMode === 'partially_paid'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-2 ring-amber-500/20'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-semibold">Installment / Advance</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Partially Paid</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusMode('pending');
                      setCustomAmountPaid('');
                    }}
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                      paymentStatusMode === 'pending'
                        ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300 ring-2 ring-red-500/20'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-semibold">Unpaid / Pending</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Pay Later</div>
                  </button>
                </div>
              </div>

              {/* Payment Method & Amount Paid inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer / Online Transfer</SelectItem>
                      <SelectItem value="Direct Cash Deposit">Direct Cash Deposit (CDM)</SelectItem>
                      <SelectItem value="Cash">Cash in Hand</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Card / POS">Credit / Debit Card (POS)</SelectItem>
                      <SelectItem value="Complimentary">Complimentary / Free</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Amount Paid (LKR)</Label>
                    {paymentStatusMode === 'partially_paid' && totalPrice > 0 && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setCustomAmountPaid((totalPrice * 0.5).toString())}
                          className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-mono"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomAmountPaid(totalPrice.toString())}
                          className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-mono"
                        >
                          100%
                        </button>
                      </div>
                    )}
                  </div>
                  <Input 
                    type="number" 
                    min="0"
                    max={totalPrice}
                    placeholder={paymentStatusMode === 'paid' ? totalPrice.toString() : "0.00"} 
                    value={paymentStatusMode === 'paid' ? totalPrice : (paymentStatusMode === 'pending' ? '0' : customAmountPaid)}
                    disabled={paymentStatusMode !== 'partially_paid'}
                    onChange={(e) => setCustomAmountPaid(e.target.value)}
                  />
                </div>
              </div>

              {/* Payment Slip Upload Box */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-primary"/> Payment Slip / Proof of Payment (Optional)
                </Label>
                
                {paymentSlipFile ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-3">
                      {paymentSlipPreview ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden border">
                          <Image src={paymentSlipPreview} alt="Slip Preview" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium truncate max-w-xs">{paymentSlipFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(paymentSlipFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSlip} className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4 mr-1"/> Remove
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 rounded-lg p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20"
                  >
                    <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Click to upload bank transfer slip or receipt</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WEBP, or PDF (Max 10MB)</p>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp,application/pdf" 
                      className="hidden" 
                      onChange={handleSlipChange} 
                    />
                  </div>
                )}
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Reference / Txn No.</Label>
                  <Input 
                    placeholder="e.g., TXN-98432174" 
                    value={paymentReference} 
                    onChange={(e) => setPaymentReference(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Notes / Remarks</Label>
                  <Input 
                    placeholder="e.g., Advance paid via HNB. Balance on event day." 
                    value={paymentNotes} 
                    onChange={(e) => setPaymentNotes(e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Booking & Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {eventDetails && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground"/>
                  <div>
                    <p className="font-semibold">{eventDetails.name}</p>
                    <p className="text-muted-foreground text-xs">{eventDetails.location}</p>
                  </div>
                </div>
              )}
              {selectedShowtime && (
                <div className="flex items-start space-x-2">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground"/>
                  <p className="text-xs">{format(new Date(selectedShowtime.dateTime), 'PPp')}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-2">
                {Object.entries(ticketQuantities).map(([id, qty]) => {
                  if (qty <= 0) return null;
                  const type = selectedShowtime?.ticketAvailabilities.find(a => a.ticketType.id === id);
                  return (
                    <div key={id} className="flex justify-between text-xs">
                      <span>{qty} x {type?.ticketType.name}</span>
                      <span>LKR {(qty * (type?.ticketType.price || 0)).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Financial Ledger Breakdown */}
              <div className="space-y-2 pt-1 font-mono text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Amount:</span>
                  <span className="font-bold text-foreground">LKR {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Amount Paid:</span>
                  <span className="font-bold">LKR {effectivePaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400 border-t pt-1 font-semibold">
                  <span>Balance Due:</span>
                  <span>LKR {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="pt-2">
                <Badge 
                  variant="outline" 
                  className={`w-full justify-center py-1 text-xs font-semibold uppercase tracking-wider ${
                    paymentStatusMode === 'paid' 
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300' 
                      : (paymentStatusMode === 'partially_paid' 
                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' 
                        : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300')
                  }`}
                >
                  {paymentStatusMode === 'paid' ? 'Fully Paid' : (paymentStatusMode === 'partially_paid' ? 'Partially Paid' : 'Pending')}
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                disabled={isSubmitting || totalPrice === 0}
                onClick={billingForm.handleSubmit(onSubmit)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2"/>
                    Confirm & Issue Booking
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
