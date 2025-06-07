
"use client";

import { useEffect, useState } from 'react';
import type { Booking } from '@/lib/types';
import { adminGetAllBookings } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Ticket, ExternalLink } from 'lucide-react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Bookings | MyPass.lk Admin';
    }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    const allBookings = await adminGetAllBookings();
    setBookings(allBookings);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground font-headline">Manage Bookings</h1>
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
        <h1 className="text-3xl font-bold text-foreground font-headline">Manage Bookings</h1>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const totalTickets = booking.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                      <TableCell className="font-medium">{booking.eventName}</TableCell>
                      <TableCell>{new Date(booking.eventDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{booking.userId}</TableCell>
                      <TableCell className="text-right">{totalTickets}</TableCell>
                      <TableCell className="text-right">LKR {booking.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>{new Date(booking.bookingDate).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/booking-confirmation/${booking.id}`} target="_blank">
                            View <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
       <Card className="mt-6">
        <CardHeader>
            <CardTitle>Advanced Booking Management</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Features such as modifying bookings, issuing refunds, or resending confirmation emails are planned for future development.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
