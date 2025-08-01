
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Booking, BillingAddress } from '@/lib/types';
import { transformApiBookingToAppBooking } from '@/lib/mockData';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const ITEMS_PER_PAGE = 10;

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
  payment_status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

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

      const processedBookings = API_BASE_URL
        ? rawData.map(item => transformApiBookingToAppBooking(item))
        : rawData.map(item => transformApiBookingToAppBooking(item));

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

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(booking => (booking.payment_status || 'pending').toLowerCase() === statusFilter);
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
  }, [bookings, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
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
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={handleFilterChange}>
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
            {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Bookings ({filteredBookings.length})
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
                    <TableHead>Event Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead>Booked On</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((booking) => {
                    const totalTickets = (booking.bookedTickets && Array.isArray(booking.bookedTickets))
                      ? booking.bookedTickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0)
                      : 0;
                    const paymentStatus = (booking.payment_status || 'pending').toLowerCase();
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{booking.id}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{booking.eventName}</TableCell>
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
                        <TableCell className="text-right whitespace-nowrap">{totalTickets}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">LKR {typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : 'N/A'}</TableCell>
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
              Showing <strong>{paginatedBookings.length}</strong> of <strong>{filteredBookings.length}</strong> bookings.
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
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
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
}

    