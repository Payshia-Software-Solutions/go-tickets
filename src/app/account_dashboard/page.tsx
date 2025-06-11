
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, CalendarDays, MapPin, Loader2, AlertCircle } from 'lucide-react';
import type { Booking } from '@/lib/types';
import Link from 'next/link';
// Removed: import type { Metadata } from 'next';

// Client component - static metadata export will not work here.
// Dynamic title set via useEffect.
// export const metadata: Metadata = {
//   title: 'My Dashboard - Bookings',
//   robots: {
//     index: false,
//     follow: true,
//   },
// };

const AccountDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'My Account Dashboard | MyPass.lk';
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/account_dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      // Mock fetching user bookings
      // const fetchBookings = async () => {
      //   setIsLoadingBookings(true);
      //   // const userBookings = await getUserBookings(user.id); // This function needs to be created in mockData
      //   // For now, use an empty array or some predefined mock bookings if available globally
      //   // Example: filter global mockBookings (if it were exported and populated from createBooking)
      //   setBookings([]); // Replace with actual fetch logic
      //   setIsLoadingBookings(false);
      // };
      // fetchBookings();
      // For this example, we'll assume bookings are not fetched this way,
      // but would appear if user makes bookings during the session.
      // Or, if bookings were persisted in localStorage tied to user ID.
      // For simplicity:
      setIsLoadingBookings(false); 
      setBookings([]); // Placeholder: No bookings displayed unless dynamically added via flow
    }
  }, [user]);

  if (authLoading || isLoadingBookings) {
    return (
      <div className="container mx-auto py-12 text-center flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the redirect, but as a fallback:
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-xl">Please log in to view your dashboard.</p>
        <Button onClick={() => router.push('/login?redirect=/account_dashboard')} className="mt-4">Login</Button>
      </div>
    );
  }
  
  // For now, as mockBookings is not populated from localStorage for existing user:
  // A more complete mock would involve storing bookings in localStorage and retrieving them here.
  // The current flow only adds to mockBookings in memory via createBooking.

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold font-headline mb-8">Welcome, {user.name || user.email}!</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Ticket className="mr-2 h-6 w-6 text-primary" /> Your Bookings</CardTitle>
          <CardDescription>Here are the events you've booked tickets for.</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-10">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">You haven&apos;t booked any tickets yet.</p>
              <Button asChild>
                <Link href="/search">Find Events</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => {
                const eventDate = new Date(booking.eventDate);
                const formattedEventDate = eventDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                const formattedEventTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{booking.eventName}</CardTitle>
                       <CardDescription>Booking ID: {booking.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-accent" /> {formattedEventDate} at {formattedEventTime}</p>
                      <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-accent" /> {booking.eventLocation}</p>
                      <div>
                        <span className="font-semibold">Tickets:</span>
                        <ul className="list-disc list-inside ml-4">
                        {booking.bookedTickets.map((ticket, idx) => (
                          <li key={idx}>{ticket.quantity} x {ticket.ticketTypeName}</li>
                        ))}
                        </ul>
                      </div>
                      <p><span className="font-semibold">Total Paid:</span> LKR {booking.totalPrice.toFixed(2)}</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" asChild>
                        <Link href={`/booking-confirmation/${booking.id}`}>View Details & QR</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDashboardPage;
