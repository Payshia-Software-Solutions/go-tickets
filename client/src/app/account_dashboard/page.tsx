
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, CalendarDays, MapPin, Loader2, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import type { Booking } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getUserBookings } from '@/lib/mockData';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const AccountDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const status = (booking.payment_status || 'pending').toLowerCase();
      if (statusFilter === 'all') return true;
      if (statusFilter === 'paid') return status === 'paid';
      if (statusFilter === 'pending') return status !== 'paid'; // Treat anything not 'paid' as pending/other
      return true;
    });
  }, [bookings, statusFilter]);

  const paidCount = useMemo(() => bookings.filter(b => (b.payment_status || 'pending').toLowerCase() === 'paid').length, [bookings]);
  const pendingCount = useMemo(() => bookings.length - paidCount, [bookings, paidCount]);


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
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-[auto,auto,auto]">
              <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({paidCount})</TabsTrigger>
              <TabsTrigger value="pending">Pending/Other ({pendingCount})</TabsTrigger>
            </TabsList>
          </Tabs>
          
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
          {!isLoadingBookings && bookings.length > 0 && filteredBookings.length === 0 && (
             <div className="text-center py-10">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No bookings found for the selected filter.</p>
            </div>
          )}
          {!isLoadingBookings && filteredBookings.length > 0 && (
            <div className="space-y-6">
              {filteredBookings.map((booking) => {
                const eventDate = new Date(booking.eventDate);
                const formattedEventDate = eventDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                const formattedEventTime = booking.showtime || eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                const paymentStatus = (booking.payment_status || 'pending').toLowerCase();

                return (
                  <Card key={booking.id} className="hover:shadow-xl transition-shadow rounded-xl overflow-hidden">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{booking.eventName}</CardTitle>
                          <CardDescription>Booking ID: {booking.id}</CardDescription>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={cn('capitalize', {
                            'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800': paymentStatus === 'paid',
                            'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800': paymentStatus !== 'paid',
                          })}
                        >
                          {paymentStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-accent" /> {formattedEventDate} at {formattedEventTime}</p>
                      <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-accent" /> {booking.eventLocation}</p>
                      {booking.tickettype && (
                        <div>
                          <span className="font-semibold">Tickets:</span> {booking.tickettype}
                        </div>
                      )}
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
                        <Link href={`/booking-confirmation?order_id=${booking.id}`}>View Details & QR</Link>
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
