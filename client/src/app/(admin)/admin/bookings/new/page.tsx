"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, ArrowLeft, Ticket, CalendarDays, User, MapPin, 
  CheckCircle, Minus, Plus, CreditCard, UploadCloud, 
  FileText, X, AlertCircle, Banknote, DollarSign, Clock,
  ChevronDown, ChevronUp, Phone, Mail, Building2, Sparkles,
  Receipt, ShieldCheck, Check, Gift
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminGetAllEvents, getAdminEventById, createBooking } from '@/lib/mockData';
import { uploadPaymentSlip } from '@/lib/services/booking.service';
import type { Event, BillingAddress, CartItem } from '@/lib/types';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { z } from 'zod';

// Practical schema for manual booking: makes phone & name required, address fields optional for quick counter bookings
const ManualBookingFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("A valid email is required for ticket delivery."),
  phone_number: z.string().min(7, "A valid phone number is required."),
  nic: z.string().optional().or(z.literal('')),
  street: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

type ManualBookingFormData = z.infer<typeof ManualBookingFormSchema>;

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
  const [showAddressFields, setShowAddressFields] = useState<boolean>(false);

  // Payment Tracking State
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [paymentStatusMode, setPaymentStatusMode] = useState<'paid' | 'partially_paid' | 'pending'>('paid');
  const [customAmountPaid, setCustomAmountPaid] = useState<string>('');
  const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);
  const [paymentSlipPreview, setPaymentSlipPreview] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isComplimentary = paymentMethod === 'Complimentary';

  useEffect(() => {
    if (isComplimentary) {
      setPaymentStatusMode('paid');
      setCustomAmountPaid('');
    }
  }, [isComplimentary]);

  const isSlipRequired = useMemo(() => {
    if (isComplimentary) return false;
    return (paymentStatusMode !== 'pending') && (paymentMethod === 'Bank Transfer' || paymentMethod === 'Direct Cash Deposit');
  }, [isComplimentary, paymentStatusMode, paymentMethod]);

  const billingForm = useForm<ManualBookingFormData>({
    resolver: zodResolver(ManualBookingFormSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone_number: "",
      nic: "",
      street: "",
      city: "Colombo",
      state: "Western",
      postalCode: "00100",
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

  const totalTicketsCount = useMemo(() => {
    return Object.values(ticketQuantities).reduce((acc, qty) => acc + (qty || 0), 0);
  }, [ticketQuantities]);

  const handleQuantityChange = (ticketTypeId: string, change: number, max: number) => {
    const current = ticketQuantities[ticketTypeId] || 0;
    const next = Math.max(0, Math.min(max, current + change));
    setTicketQuantities(prev => ({ ...prev, [ticketTypeId]: next }));
  };

  const setExactQuantity = (ticketTypeId: string, value: number, max: number) => {
    const next = isNaN(value) ? 0 : Math.max(0, Math.min(max, value));
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
    if (isComplimentary) return 0; // Customer paid LKR 0 (Free invitation)
    if (paymentStatusMode === 'paid') return totalPrice;
    if (paymentStatusMode === 'pending') return 0;
    const parsed = parseFloat(customAmountPaid);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(totalPrice, parsed));
  }, [isComplimentary, paymentStatusMode, customAmountPaid, totalPrice]);

  const balanceDue = useMemo(() => {
    if (isComplimentary) return 0; // Balance is 0 for complimentary
    return Math.max(0, totalPrice - effectivePaidAmount);
  }, [isComplimentary, totalPrice, effectivePaidAmount]);

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

  const onSubmit = async (formData: ManualBookingFormData) => {
    if (!eventDetails || !selectedShowtime) return;
    
    const cart: CartItem[] = selectedShowtime.ticketAvailabilities
      .filter(avail => (ticketQuantities[avail.ticketType.id] || 0) > 0)
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
      toast({ title: "No Tickets Selected", description: "Please select at least one ticket before proceeding.", variant: "destructive" });
      return;
    }

    const isSlipRequired = (paymentStatusMode !== 'pending') && (paymentMethod === 'Bank Transfer' || paymentMethod === 'Direct Cash Deposit');
    if (isSlipRequired && !paymentSlipFile) {
      toast({ 
        title: "Payment Slip Required", 
        description: `Please attach the bank transfer / CDM slip for ${paymentMethod}. (Or choose 'Cash in Hand' if cash was received).`, 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedSlipUrl: string | null = null;
      if (paymentSlipFile) {
        toast({ title: "Uploading Slip", description: "Uploading payment slip receipt..." });
        const uploadResult = await uploadPaymentSlip(paymentSlipFile);
        uploadedSlipUrl = uploadResult.filePath;
      }

      const paymentStatusValue = isComplimentary ? 'Paid' : (
        paymentStatusMode === 'paid' ? 'Paid' : 
        (paymentStatusMode === 'partially_paid' ? 'Partially Paid' : 'pending')
      );

      const billingPayload: BillingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone_number: formData.phone_number,
        nic: formData.nic || undefined,
        street: formData.street || 'N/A',
        city: formData.city || 'Colombo',
        state: formData.state || 'Western',
        postalCode: formData.postalCode || '00100',
        country: formData.country || 'Sri Lanka',
      };

      const responseText = await createBooking({
        userId: currentAdmin?.id || '1',
        cart,
        totalPrice,
        billingAddress: billingPayload,
        isGuest: true,
        booked_type: 'manualy',
        payment_status: paymentStatusValue,
        amount_paid: isComplimentary ? 0 : effectivePaidAmount,
        balance_amount: isComplimentary ? 0 : balanceDue,
        payment_method: paymentMethod,
        payment_slip: uploadedSlipUrl,
        payment_notes: paymentNotes || (isComplimentary ? 'Complimentary VIP / Free Pass' : (paymentReference ? `Ref: ${paymentReference}` : undefined)),
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
        // Fallback
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
        title: "Error Creating Booking", 
        description: error instanceof Error ? error.message : "Failed to create booking.", 
        variant: "destructive" 
      });
      setIsSubmitting(false);
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">Loading events catalogue...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.back()}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Button>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
              Offline Ticketing & Counter Sales
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manual Booking Creation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Issue direct bookings, record bank transfers/cash, attach payment slips, and manage partial installments.
          </p>
        </div>

        {/* Quick Progress / Step Indicators */}
        <div className="hidden lg:flex items-center space-x-3 text-xs text-muted-foreground bg-muted/30 px-3.5 py-2 rounded-lg border">
          <span className={`flex items-center font-medium ${selectedEventId && selectedShowtimeId ? 'text-primary' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mr-1.5 text-[11px]">1</span>
            Tickets
          </span>
          <span>&rarr;</span>
          <span className="flex items-center font-medium">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mr-1.5 text-[11px]">2</span>
            Attendee
          </span>
          <span>&rarr;</span>
          <span className="flex items-center font-medium">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mr-1.5 text-[11px]">3</span>
            Payment & Slip
          </span>
        </div>
      </div>

      {/* Main Full-Width Grid: Left Form (7 cols) + Right Summary & Actions (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN (TICKETS & ATTENDEE INFO) ================= */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Card 1: Event & Ticket Selection */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-semibold">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <span>1. Select Event, Showtime & Tickets</span>
                </CardTitle>
                {selectedEventId && (
                  <Badge variant="outline" className="text-xs">
                    {totalTicketsCount} Ticket{totalTicketsCount === 1 ? '' : 's'} Selected
                  </Badge>
                )}
              </div>
              <CardDescription>
                Choose an active event and select the ticket category with quantities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Event & Showtime side-by-side on tablet/desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Select Event <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <span className="font-medium">{e.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Showtime & Session <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={selectedShowtimeId || ""} 
                    onValueChange={setSelectedShowtimeId}
                    disabled={!selectedEventId || isLoadingDetails}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingDetails ? "Loading sessions..." : (selectedEventId ? "Choose showtime..." : "Select event first")} />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDetails?.showTimes?.map(st => (
                        <SelectItem key={st.id} value={st.id}>
                          {format(new Date(st.dateTime), 'PPp')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Event Quick Details Banner */}
              {isLoadingDetails && (
                <div className="flex items-center justify-center py-6 bg-muted/20 rounded-lg border border-dashed">
                  <Loader2 className="animate-spin h-5 w-5 text-primary mr-2"/>
                  <span className="text-xs text-muted-foreground">Fetching event information...</span>
                </div>
              )}

              {eventDetails && !isLoadingDetails && (
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 p-3 bg-muted/20 rounded-lg border text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0"/>
                    <span className="truncate max-w-[280px]">{eventDetails.location || 'Colombo, Sri Lanka'}</span>
                  </div>
                  {eventDetails.category && (
                    <Badge variant="outline" className="text-[11px] py-0 px-2">
                      {eventDetails.category}
                    </Badge>
                  )}
                  {selectedShowtime && (
                    <div className="flex items-center gap-1 text-primary font-medium ml-auto">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{format(new Date(selectedShowtime.dateTime), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Ticket Quantities Grid */}
              {selectedShowtime && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Available Ticket Categories
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Adjust counts using buttons or type quantity
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedShowtime.ticketAvailabilities.map(avail => {
                      const qty = ticketQuantities[avail.ticketType.id] || 0;
                      const isSelected = qty > 0;
                      const isSoldOut = avail.availableCount <= 0;

                      return (
                        <div 
                          key={avail.ticketType.id} 
                          className={`p-3.5 rounded-lg border transition-all ${
                            isSelected 
                              ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                              : 'border-border bg-card hover:border-muted-foreground/30'
                          } ${isSoldOut ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-sm leading-tight text-foreground">
                                {avail.ticketType.name}
                              </p>
                              <p className="text-sm font-bold text-primary mt-0.5">
                                LKR {avail.ticketType.price.toLocaleString()}
                              </p>
                            </div>
                            <Badge 
                              variant={avail.availableCount > 10 ? "secondary" : "destructive"} 
                              className="text-[10px] font-mono font-medium px-1.5 py-0"
                            >
                              {avail.availableCount} left
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t mt-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {isSelected ? `Sub: LKR ${(qty * avail.ticketType.price).toLocaleString()}` : 'Qty'}
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <Button 
                                type="button"
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 rounded-md" 
                                onClick={() => handleQuantityChange(avail.ticketType.id, -1, avail.availableCount)}
                                disabled={qty <= 0}
                              >
                                <Minus className="h-3.5 w-3.5"/>
                              </Button>
                              <Input 
                                type="number" 
                                min="0" 
                                max={avail.availableCount}
                                value={qty || ''} 
                                onChange={(e) => setExactQuantity(avail.ticketType.id, parseInt(e.target.value) || 0, avail.availableCount)}
                                placeholder="0"
                                className="h-7 w-12 text-center font-bold text-xs p-1"
                              />
                              <Button 
                                type="button"
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 rounded-md" 
                                onClick={() => handleQuantityChange(avail.ticketType.id, 1, avail.availableCount)}
                                disabled={qty >= avail.availableCount}
                              >
                                <Plus className="h-3.5 w-3.5"/>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Attendee & Customer Details */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-semibold">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <span>2. Customer & Attendee Details</span>
                </CardTitle>
                <span className="text-xs text-muted-foreground">e-Ticket will be delivered here</span>
              </div>
              <CardDescription>
                Essential contact information for booking confirmation and QR code admission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...billingForm}>
                <div className="space-y-4">
                  {/* Row 1: Name fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="firstName" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Samantha" className="h-9 text-sm" {...field}/>
                        </FormControl>
                        <FormMessage className="text-[11px]"/>
                      </FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="lastName" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Perera" className="h-9 text-sm" {...field}/>
                        </FormControl>
                        <FormMessage className="text-[11px]"/>
                      </FormItem>
                    )}/>
                  </div>

                  {/* Row 2: Contact fields (Phone, Email, NIC) in 3-column desktop grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={billingForm.control} name="phone_number" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground"/> Phone Number *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="0771234567" className="h-9 text-sm" {...field}/>
                        </FormControl>
                        <FormMessage className="text-[11px]"/>
                      </FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="email" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground"/> Email Address *
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="customer@example.com" className="h-9 text-sm" {...field}/>
                        </FormControl>
                        <FormMessage className="text-[11px]"/>
                      </FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="nic" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold">NIC / Passport (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 199512345678" className="h-9 text-sm" {...field}/>
                        </FormControl>
                        <FormMessage className="text-[11px]"/>
                      </FormItem>
                    )}/>
                  </div>

                  {/* Collapsible Address Details to keep the page clean and compact */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddressFields(!showAddressFields)}
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 flex items-center gap-1.5"
                    >
                      {showAddressFields ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      <span>{showAddressFields ? "Hide Address Details" : "+ Add Billing / Street Address (Optional)"}</span>
                    </Button>

                    {showAddressFields && (
                      <div className="space-y-3 mt-3 p-3.5 bg-muted/20 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-200">
                        <FormField control={billingForm.control} name="street" render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs font-semibold">Street Address</FormLabel>
                            <FormControl><Input placeholder="123 Galle Road" className="h-9 text-sm" {...field}/></FormControl>
                            <FormMessage className="text-[11px]"/>
                          </FormItem>
                        )}/>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <FormField control={billingForm.control} name="city" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold">City</FormLabel>
                              <FormControl><Input placeholder="Colombo" className="h-9 text-sm" {...field}/></FormControl>
                              <FormMessage className="text-[11px]"/>
                            </FormItem>
                          )}/>
                          <FormField control={billingForm.control} name="state" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold">Province / State</FormLabel>
                              <FormControl><Input placeholder="Western" className="h-9 text-sm" {...field}/></FormControl>
                              <FormMessage className="text-[11px]"/>
                            </FormItem>
                          )}/>
                          <FormField control={billingForm.control} name="postalCode" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold">Postal Code</FormLabel>
                              <FormControl><Input placeholder="00100" className="h-9 text-sm" {...field}/></FormControl>
                              <FormMessage className="text-[11px]"/>
                            </FormItem>
                          )}/>
                          <FormField control={billingForm.control} name="country" render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold">Country</FormLabel>
                              <FormControl><Input placeholder="Sri Lanka" className="h-9 text-sm" {...field}/></FormControl>
                              <FormMessage className="text-[11px]"/>
                            </FormItem>
                          )}/>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN (PAYMENT, SLIP & SUMMARY) ================= */}
        <div className="xl:col-span-5 space-y-6">

          {/* Card 3: Payment Record & Slip Upload */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-semibold">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span>3. Payment Record & Slip Verification</span>
              </CardTitle>
              <CardDescription>
                Record paid amounts, installment advances, and attach bank transfer receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Payment Mode Selector Pills */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Status
                </Label>
                {isComplimentary ? (
                  <div className="p-3 rounded-lg border border-purple-300 bg-purple-50/80 dark:bg-purple-950/40 dark:border-purple-800 flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-purple-900 dark:text-purple-200">100% Complimentary Free Pass</p>
                        <p className="text-[11px] text-purple-700 dark:text-purple-300">Admission ticket will be issued with full 100% waiver (LKR 0.00 Due).</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-mono text-[10px]">100% FREE</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentStatusMode('paid');
                        setCustomAmountPaid('');
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        paymentStatusMode === 'paid'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 ring-2 ring-emerald-600/20'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-semibold text-xs">
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Full Paid
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">100% Upfront</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentStatusMode('partially_paid');
                        if (!customAmountPaid && totalPrice > 0) {
                          setCustomAmountPaid((totalPrice / 2).toString());
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        paymentStatusMode === 'partially_paid'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 ring-2 ring-amber-500/20'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-semibold text-xs">
                        <Clock className="h-3.5 w-3.5 text-amber-600" /> Advance
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Installment</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentStatusMode('pending');
                        setCustomAmountPaid('');
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        paymentStatusMode === 'pending'
                          ? 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 ring-2 ring-rose-500/20'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-semibold text-xs">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Pending
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Pay Later</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Method & Paid Amount (2-col grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer / Slip</SelectItem>
                      <SelectItem value="Direct Cash Deposit">Cash Deposit (CDM)</SelectItem>
                      <SelectItem value="Cash">Cash in Hand</SelectItem>
                      <SelectItem value="Card / POS">Credit / Debit Card (POS)</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Complimentary">Complimentary / Free Pass</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Amount Paid (LKR)</Label>
                    {!isComplimentary && paymentStatusMode === 'partially_paid' && totalPrice > 0 && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setCustomAmountPaid((totalPrice * 0.25).toString())}
                          className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-mono"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomAmountPaid((totalPrice * 0.5).toString())}
                          className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-mono"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomAmountPaid((totalPrice * 0.75).toString())}
                          className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-mono"
                        >
                          75%
                        </button>
                      </div>
                    )}
                  </div>
                  <Input 
                    type="text" 
                    placeholder={isComplimentary ? "0.00 (Free Pass)" : (paymentStatusMode === 'paid' ? totalPrice.toString() : "0.00")} 
                    value={
                      isComplimentary 
                        ? '0.00 (100% Free Waiver)' 
                        : (paymentStatusMode === 'paid' ? totalPrice : (paymentStatusMode === 'pending' ? '0' : customAmountPaid))
                    }
                    disabled={isComplimentary || paymentStatusMode !== 'partially_paid'}
                    onChange={(e) => setCustomAmountPaid(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Payment Slip Upload Box */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="h-3.5 w-3.5 text-primary"/>
                    {paymentMethod === 'Cash' ? 'Payment Proof / Counter Receipt' : 'Bank Slip / Payment Proof'}{' '}
                    {isSlipRequired && <span className="text-destructive font-bold">*</span>}
                  </span>
                  <span className={`text-[11px] ${isSlipRequired ? 'text-destructive font-semibold' : 'text-muted-foreground font-normal'}`}>
                    {isSlipRequired ? 'Required for Bank/CDM' : (paymentMethod === 'Cash' ? 'Optional for Cash in Hand' : 'Optional')}
                  </span>
                </Label>
                
                {paymentSlipFile ? (
                  <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/20">
                    <div className="flex items-center space-x-3">
                      {paymentSlipPreview ? (
                        <div className="relative w-11 h-11 rounded-md overflow-hidden border shadow-xs">
                          <Image src={paymentSlipPreview} alt="Slip Preview" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-md bg-muted flex items-center justify-center border">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium truncate max-w-[200px]">{paymentSlipFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(paymentSlipFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSlip} className="h-7 px-2 text-destructive hover:text-destructive text-xs">
                      <X className="h-3.5 w-3.5 mr-1"/> Remove
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-3.5 text-center cursor-pointer transition-colors ${
                      isSlipRequired 
                        ? 'border-amber-500/50 bg-amber-50/10 hover:border-amber-500' 
                        : 'border-muted-foreground/25 hover:border-primary/60 bg-muted/5 hover:bg-muted/15'
                    }`}
                  >
                    <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs font-medium">
                      {isSlipRequired ? 'Click to upload bank transfer slip (Required)' : 'Click to upload deposit slip or counter receipt (Optional)'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WEBP, or PDF (Max 10MB)</p>
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

              {/* Reference & Notes (2-col grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bank / Txn Ref No.</Label>
                  <Input 
                    placeholder="e.g., TXN-98432174" 
                    value={paymentReference} 
                    onChange={(e) => setPaymentReference(e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Payment Notes / Remarks</Label>
                  <Input 
                    placeholder="e.g., Advance paid via CDM" 
                    value={paymentNotes} 
                    onChange={(e) => setPaymentNotes(e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Live Booking & Financial Summary (Sticky) */}
          <Card className="border-2 border-primary/40 shadow-md sticky top-6 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Order & Ledger Summary</span>
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={`text-[11px] font-semibold uppercase px-2 py-0.5 ${
                    isComplimentary
                      ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                      : paymentStatusMode === 'paid' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' 
                        : (paymentStatusMode === 'partially_paid' 
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' 
                          : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300')
                  }`}
                >
                  {isComplimentary ? 'Complimentary Pass' : (paymentStatusMode === 'paid' ? 'Fully Paid' : (paymentStatusMode === 'partially_paid' ? 'Partially Paid' : 'Pending'))}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3.5 text-xs">
              {/* Event & Showtime info in summary */}
              {eventDetails && (
                <div className="p-2.5 rounded-md bg-muted/30 border space-y-1 text-xs">
                  <p className="font-semibold text-foreground truncate">{eventDetails.name}</p>
                  {selectedShowtime && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-primary shrink-0"/>
                      {format(new Date(selectedShowtime.dateTime), 'PPp')}
                    </p>
                  )}
                </div>
              )}

              {/* Ticket Breakdown */}
              <div className="space-y-1.5 border-t pt-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Ticket Breakdown ({totalTicketsCount})
                </p>
                {totalTicketsCount === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No tickets selected yet. Choose counts on the left.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {Object.entries(ticketQuantities).map(([id, qty]) => {
                      if (qty <= 0) return null;
                      const type = selectedShowtime?.ticketAvailabilities.find(a => a.ticketType.id === id);
                      return (
                        <div key={id} className="flex justify-between items-center text-xs py-0.5">
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            <strong className="text-foreground font-mono">{qty}x</strong> {type?.ticketType.name}
                          </span>
                          <span className="font-mono font-medium">
                            LKR {(qty * (type?.ticketType.price || 0)).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Financial Ledger (Total / Paid / Balance) */}
              <div className="space-y-2 border-t pt-3 font-mono">
                {isComplimentary ? (
                  <>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Standard Ticket Value:</span>
                      <span className="line-through text-muted-foreground">
                        LKR {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3" /> Complimentary Waiver:
                      </span>
                      <span>- 100% (FREE)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Total Amount Charged:</span>
                      <span className="text-sm font-bold text-foreground">
                        LKR 0.00
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-2">
                      <span className="font-semibold text-foreground">Balance Due:</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        LKR 0.00 (Settled)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Total Amount:</span>
                      <span className="text-sm font-bold text-foreground">
                        LKR {totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> Amount Paid:
                      </span>
                      <span className="font-bold">
                        LKR {effectivePaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t pt-2">
                      <span className="font-semibold text-foreground">Balance Due:</span>
                      <span className={`text-sm font-bold ${balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        LKR {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button 
                  className={`w-full h-11 text-sm font-bold shadow-md ${
                    isComplimentary 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : ''
                  }`} 
                  disabled={isSubmitting || totalTicketsCount === 0}
                  onClick={billingForm.handleSubmit(onSubmit)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                      {isComplimentary ? 'Issuing Free Passes...' : 'Issuing Booking & Tickets...'}
                    </>
                  ) : isComplimentary ? (
                    <>
                      <Gift className="h-4 w-4 mr-2"/>
                      Confirm & Issue Free Passes ({totalTicketsCount})
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2"/>
                      Confirm & Issue Booking ({totalTicketsCount} Ticket{totalTicketsCount === 1 ? '' : 's'})
                    </>
                  )}
                </Button>
                {totalTicketsCount === 0 && (
                  <p className="text-[11px] text-center text-muted-foreground mt-1.5">
                    Select at least 1 ticket to enable booking creation
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
