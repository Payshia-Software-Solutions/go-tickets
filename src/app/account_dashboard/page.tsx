
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, CalendarDays, MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { Booking } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getUserBookings } from '@/lib/mockData';


const AccountDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'My Account Dashboard | GoTickets.lk';
    }
  }, []);

  const fetchUserBookings = useCallback(async () => {
    if (user) {
      setIsLoadingBookings(true);
      try {
        const userBookingsData = await getUserBookings(user.id);
        setBookings(userBookingsData);
      } catch (error) {
        console.error("Error fetching user bookings:", error);
        toast({
          title: "Error Fetching Bookings",
          description: "Could not load your bookings. Please try again.",
          variant: "destructive",
        });
        setBookings([]); // Clear bookings on error
      } finally {
        setIsLoadingBookings(false);
      }
    } else {
        // No user, so no bookings to fetch; ensure loading is false and bookings are clear.
        setBookings([]);
        setIsLoadingBookings(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/account_dashboard');
    } else if (!authLoading && user) {
      fetchUserBookings();
    }
  }, [user, authLoading, router, fetchUserBookings]);


  if (authLoading || (!user && !authLoading)) { // Show loader if auth is loading or if redirecting (user is null post-auth check)
    return (
      <div className="container mx-auto py-12 text-center flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // This check should be after authLoading is false and user object is determined
  if (!user) {
     // This state should ideally be brief due to the redirect logic above.
     // If it persists, it means the redirect hasn't happened or user became null unexpectedly.
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-xl">Please log in to view your dashboard.</p>
        <Button onClick={() => router.push('/login?redirect=/account_dashboard')} className="mt-4">Login</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold font-headline text-center sm:text-left">Welcome, {user.name || user.email}!</h1>
        <Button onClick={fetchUserBookings} variant="outline" disabled={isLoadingBookings}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingBookings ? 'animate-spin' : ''}`} />
          Refresh Bookings
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Ticket className="mr-2 h-6 w-6 text-primary" /> Your Bookings</CardTitle>
          <CardDescription>Here are the events you&apos;ve booked tickets for.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBookings && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading your bookings...</p>
            </div>
          )}
          {!isLoadingBookings && bookings.length === 0 && (
            <div className="text-center py-10">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">You haven&apos;t booked any tickets yet.</p>
              <Button asChild>
                <Link href="/search">Find Events</Link>
              </Button>
            </div>
          )}
          {!isLoadingBookings && bookings.length > 0 && (
            <div className="space-y-6">
              {bookings.map((booking) => {
                const eventDate = new Date(booking.eventDate);
                const formattedEventDate = eventDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                // Use booking.showtime if available, otherwise format from eventDate
                const formattedEventTime = booking.showtime || eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <Card key={booking.id} className="hover:shadow-xl transition-shadow rounded-xl overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-xl">{booking.eventName}</CardTitle>
                       <CardDescription>Booking ID: {booking.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-accent" /> {formattedEventDate} at {formattedEventTime}</p>
                      <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-accent" /> {booking.eventLocation}</p>
                      {booking.tickettype && (
                        <div>
                          <span className="font-semibold">Tickets:</span> {booking.tickettype}
                        </div>
                      )}
                       {/* Fallback if booking.tickettype is not present but bookedTickets array is (e.g., from other flows) */}
                       {(!booking.tickettype && booking.bookedTickets && booking.bookedTickets.length > 0) && (
                          <div>
                            <span className="font-semibold">Tickets:</span>
                            <ul className="list-disc list-inside ml-4">
                            {booking.bookedTickets.map((ticket, idx) => (
                              <li key={idx}>{ticket.quantity} x {ticket.ticketTypeName}</li>
                            ))}
                            </ul>
                          </div>
                        )}
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
