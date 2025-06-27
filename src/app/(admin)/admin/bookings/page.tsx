
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Booking, BillingAddress } from '@/lib/types'; // Added BillingAddress
// Removed: import { adminGetAllBookings } from '@/lib/mockData';
import { transformApiBookingToAppBooking } from '@/lib/mockData'; // Import the transformer
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Ticket, ExternalLink, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Define interfaces for the raw API response structure
interface RawApiBookedTicket {
  id: string | number;
  booking_id?: string | number;
  bookingId?: string | number;
  ticket_type_id?: string | number;
  ticketTypeId?: string | number;
  ticket_type_name?: string;
  ticketTypeName?: string;
  show_time_id?: string | number;
  showTimeId?: string | number;
  quantity: string | number;
  price_per_ticket?: string | number;
  pricePerTicket?: string | number;
  event_nsid?: string;
  event_slug?: string;
  eventId?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface RawApiBooking {
  id: string | number;
  event_id?: string | number;
  eventId?: string | number;
  user_id?: string | number;
  userId?: string | number;
  booking_date?: string;
  bookingDate?: string;
  event_date?: string;
  eventDate?: string;
  event_name?: string;
  eventName?: string;
  event_location?: string;
  eventLocation?: string;
  qr_code_value?: string;
  qrCodeValue?: string;
  total_price?: string | number;
  totalPrice?: string | number;
  billing_address?: string | BillingAddress;
  booked_tickets?: RawApiBookedTicket[];
  bookedTickets?: RawApiBookedTicket[];
  event_slug?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}


export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpointPath = API_BASE_URL ? '/bookings' : '/api/admin/bookings';
      const fullFetchUrl = API_BASE_URL ? `${API_BASE_URL}${endpointPath}` : endpointPath;


      const response = await fetch(fullFetchUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Failed to fetch bookings. Status:", response.status, "Body:", errorBody);
        throw new Error(`Failed to fetch bookings. Status: ${response.status}`);
      }
      const rawData: RawApiBooking[] = await response.json();

      // If fetching directly from external API, map the data
      const processedBookings = API_BASE_URL
        ? rawData.map(item => transformApiBookingToAppBooking(item)) // Pass item instead of entire rawData
        : rawData.map(item => transformApiBookingToAppBooking(item)); // Also map if from internal API, ensure consistency

      setBookings(processedBookings);
    } catch (error) {
       console.error("Error fetching bookings:", error);
       toast({
        title: "Error Fetching Bookings",
        description: (error instanceof Error && error.message) ? error.message : "Could not load bookings from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Bookings | Event Horizon Admin';
    }
    fetchBookings();
  }, [fetchBookings]);

  const handleSendEmail = (bookingId: string) => {
    toast({
      title: "Simulate Email Sent",
      description: `Confirmation email resent for booking ID: ${bookingId} (mock).`,
    });
  };

  const handleSendSms = (bookingId: string) => {
    toast({
      title: "Simulate SMS Sent",
      description: `Booking details SMS sent for booking ID: ${bookingId} (mock).`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">Manage Bookings</h1>
          <p className="text-muted-foreground">View and manage all event bookings.</p>
        </header>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">Manage Bookings</h1>
        <p className="text-muted-foreground">View and manage all event bookings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({bookings.length})</CardTitle>
          <CardDescription>A list of all bookings made through the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-10">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bookings found yet.</p>
              <p className="text-sm text-muted-foreground">Bookings will appear here as users make them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead>Booked On</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => {
                    const totalTickets = (booking.bookedTickets && Array.isArray(booking.bookedTickets))
                      ? booking.bookedTickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0)
                      : 0;
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{booking.id}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{booking.eventName}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(booking.eventDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{booking.userId}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{totalTickets}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">LKR {typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : 'N/A'}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(booking.bookingDate).toLocaleString()}</TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          <Button variant="outline" size="sm" asChild title="View Booking Confirmation">
                            <Link href={`/booking-confirmation?order_id=${booking.id}`} target="_blank">
                              View <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                           <Button variant="outline" size="icon" title="Send Email (Mock)" onClick={() => handleSendEmail(booking.id)}>
                              <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" title="Send SMS (Mock)" onClick={() => handleSendSms(booking.id)}>
                              <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
       <Card className="mt-6">
        <CardHeader>
            <CardTitle>Advanced Booking Management</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Features such as modifying bookings, issuing refunds, or resending confirmation emails (with actual email sending) are planned for future development.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
