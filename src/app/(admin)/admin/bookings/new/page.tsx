
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Ticket, CalendarDays, User, MapPin, CheckCircle, MinusCircle, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminGetAllEvents, getAdminEventById, createBooking } from '@/lib/mockData';
import type { Event, ShowTime, BillingAddress, CartItem } from '@/lib/types';
import { BillingAddressSchema } from '@/lib/types';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

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

  const billingForm = useForm<BillingAddress>({
    resolver: zodResolver(BillingAddressSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone_number: "",
      nic: "",
      street: "Manual Entry",
      city: "N/A",
      state: "N/A",
      postalCode: "00000",
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
      // Create manual booking with payment_status 'paid'
      await createBooking({
        userId: currentAdmin?.id || '1',
        cart,
        totalPrice,
        billingAddress: billingData,
        isGuest: true,
        booked_type: 'manualy',
        payment_status: 'paid'
      });

      toast({ title: "Success", description: "Manual booking created successfully." });
      router.push('/admin/bookings');
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create booking.", variant: "destructive" });
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
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
        </Button>
        <h1 className="text-3xl font-bold font-headline mt-4">New Manual Booking</h1>
        <p className="text-muted-foreground">Enter order details for a customer booking made manually.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Step 1: Select Event */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><Ticket className="mr-2 h-5 w-5"/> 1. Select Event & Showtime</CardTitle>
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
              <CardTitle className="text-lg flex items-center"><User className="mr-2 h-5 w-5"/> 2. Attendee Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...billingForm}>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={billingForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={billingForm.control} name="phone_number" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                  </div>
                  <FormField control={billingForm.control} name="nic" render={({ field }) => (
                    <FormItem><FormLabel>NIC (Optional)</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {eventDetails && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground"/>
                  <div>
                    <p className="font-semibold">{eventDetails.name}</p>
                    <p className="text-muted-foreground">{eventDetails.location}</p>
                  </div>
                </div>
              )}
              {selectedShowtime && (
                <div className="flex items-start space-x-2">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground"/>
                  <p>{format(new Date(selectedShowtime.dateTime), 'PPp')}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-2">
                {Object.entries(ticketQuantities).map(([id, qty]) => {
                  if (qty <= 0) return null;
                  const type = selectedShowtime?.ticketAvailabilities.find(a => a.ticketType.id === id);
                  return (
                    <div key={id} className="flex justify-between">
                      <span>{qty} x {type?.ticketType.name}</span>
                      <span>LKR {(qty * (type?.ticketType.price || 0)).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>LKR {totalPrice.toLocaleString()}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                disabled={isSubmitting || totalPrice === 0 || !billingForm.formState.isValid}
                onClick={billingForm.handleSubmit(onSubmit)}
              >
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
                Create Manual Booking
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
