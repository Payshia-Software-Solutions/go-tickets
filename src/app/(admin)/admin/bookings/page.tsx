
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Booking, Event } from '@/lib/types';
import { adminGetAllBookings, adminGetAllEvents } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Ticket, ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ITEMS_PER_PAGE = 10;
const BOOKING_EVENTS_API_URL = "https://gotickets-server.payshia.com/booking-events";

interface BookingEventLink {
    id: string;
    booking_id: string;
    eventId: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookingEventMap, setBookingEventMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [processedBookings, allEvents, bookingEventsResponse] = await Promise.all([
        adminGetAllBookings(),
        adminGetAllEvents(),
        fetch(BOOKING_EVENTS_API_URL)
      ]);
      
      if (!bookingEventsResponse.ok) {
          throw new Error('Failed to fetch the booking-to-event links.');
      }
      const bookingEventLinks: BookingEventLink[] = await bookingEventsResponse.json();
      const newMap = new Map<string, string>();
      bookingEventLinks.forEach(link => {
          newMap.set(String(link.booking_id), String(link.eventId));
      });

      setBookingEventMap(newMap);
      setBookings(processedBookings);
      setEvents(allEvents);
    } catch (error) {
       console.error("Error fetching bookings or events:", error);
       toast({
        title: "Error Fetching Data",
        description: (error instanceof Error && error.message) ? error.message : "Could not load data from the server.",
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

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(booking => (booking.payment_status || 'pending').toLowerCase() === statusFilter);
    }
    
    // Event filter - using the new map
    if (eventFilter !== 'all') {
      filtered = filtered.filter(booking => {
          const bookingEventId = bookingEventMap.get(String(booking.id));
          return bookingEventId === eventFilter;
      });
    }

    // Search query filter
    if (searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(booking => {
            const userName = booking.userName?.toLowerCase() || '';
            const email = booking.billingAddress?.email?.toLowerCase() || '';
            const phone = String(booking.billingAddress?.phone_number || '');
            
            return userName.includes(lowercasedQuery) || 
                   email.includes(lowercasedQuery) ||
                   phone.includes(lowercasedQuery);
        });
    }

    return filtered;
  }, [bookings, statusFilter, eventFilter, searchQuery, bookingEventMap]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };
  
  const handleEventFilterChange = (value: string) => {
    setEventFilter(value);
    setCurrentPage(1);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
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
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <Select value={eventFilter} onValueChange={handleEventFilterChange}>
            <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filter by event..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                        {event.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Tabs value={statusFilter} onValueChange={handleStatusFilterChange}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-[auto,auto,auto]">
            <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
            <TabsTrigger value="paid">Paid ({bookings.filter(b => (b.payment_status || 'pending').toLowerCase() === 'paid').length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({bookings.filter(b => (b.payment_status || 'pending').toLowerCase() === 'pending').length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Bookings ({filteredBookings.length.toLocaleString()})
          </CardTitle>
          <CardDescription>A list of all bookings made through the platform matching the filter.</CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedBookings.length === 0 ? (
            <div className="text-center py-10">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? `No bookings found for "${searchQuery}".` : "No bookings found for this filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Event &amp; Tickets</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead>Booked On</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((booking) => {
                    const paymentStatus = (booking.payment_status || 'pending').toLowerCase();
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{booking.id}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                            <div className="font-semibold">{booking.eventName}</div>
                            {booking.tickettype && (
                                <p className="text-xs text-muted-foreground">{booking.tickettype}</p>
                            )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            <div className="font-medium">{booking.userName}</div>
                            <div className="text-xs text-muted-foreground">{booking.billingAddress?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={cn('capitalize', {
                              'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800': paymentStatus === 'paid',
                              'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800': paymentStatus === 'pending',
                              'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800': paymentStatus === 'failed',
                            })}
                          >
                            {paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(booking.eventDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">LKR {typeof booking.totalPrice === 'number' ? booking.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(booking.bookingDate).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/bookings/${booking.id}`}>
                              <FileText className="mr-2 h-3.5 w-3.5" /> Details
                            </Link>
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
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t pt-4">
             <div className="text-xs text-muted-foreground">
              Showing <strong>{paginatedBookings.length}</strong> of <strong>{filteredBookings.length.toLocaleString()}</strong> bookings.
            </div>
            <div className="flex items-center space-x-2">
               <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
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

    