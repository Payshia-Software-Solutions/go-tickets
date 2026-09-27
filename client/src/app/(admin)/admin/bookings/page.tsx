"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Booking, Event } from '@/lib/types';
import { adminGetAllBookings, adminGetAllEvents } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Ticket, ChevronLeft, ChevronRight, FileText, Search, PlusCircle, X, RotateCcw, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { API_BASE_URL } from '@/lib/constants';

const ITEMS_PER_PAGE = 10;
const BOOKING_EVENTS_API_URL = `${API_BASE_URL}/booking-events`;

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
  const [salesmanFilter, setSalesmanFilter] = useState('all');
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

  const uniqueSalesmen = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach(b => {
      if (b.salesman_name && b.salesman_name.trim() !== '' && b.salesman_name !== 'Direct') {
        set.add(b.salesman_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [bookings]);

  // Bookings filtered by event and search query (before payment status filter)
  const eventFilteredBookings = useMemo(() => {
    let result = bookings;

    // Event filter - using link map with fallback to direct booking.eventId
    if (eventFilter !== 'all') {
      result = result.filter(booking => {
        const mappedEventId = bookingEventMap.get(String(booking.id));
        return mappedEventId === eventFilter || String(booking.eventId) === eventFilter;
      });
    }

    // Salesman filter
    if (salesmanFilter !== 'all') {
      if (salesmanFilter === 'direct') {
        result = result.filter(booking => !booking.salesman_name || booking.salesman_name === 'Direct');
      } else {
        result = result.filter(booking => booking.salesman_name === salesmanFilter);
      }
    }

    // Search query filter (matches ID, customer name, email, phone, event)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(booking => {
        const idMatch = String(booking.id).includes(q);
        const userName = (booking.userName || '').toLowerCase();
        const email = (booking.billingAddress?.email || '').toLowerCase();
        const phone = String(booking.billingAddress?.phone_number || '');
        const eventName = (booking.eventName || '').toLowerCase();
        const salesman = (booking.salesman_name || '').toLowerCase();
        
        return idMatch || 
               userName.includes(q) || 
               email.includes(q) ||
               phone.includes(q) ||
               eventName.includes(q) ||
               salesman.includes(q);
      });
    }

    return result;
  }, [bookings, eventFilter, salesmanFilter, searchQuery, bookingEventMap]);

  // Payment status breakdown counts dynamically updated for the selected event!
  const statusCounts = useMemo(() => {
    let paid = 0;
    let partiallyPaid = 0;
    let pending = 0;
    let complimentary = 0;

    eventFilteredBookings.forEach(b => {
      const isComp = b.payment_method?.toLowerCase() === 'complimentary';
      if (isComp) {
        complimentary++;
        return;
      }
      const s = (b.payment_status || 'pending').toLowerCase().trim();
      if (s === 'paid') {
        paid++;
      } else if (s === 'partially paid' || s === 'partially_paid' || s === 'partial') {
        partiallyPaid++;
      } else if (s === 'pending') {
        pending++;
      }
    });

    return {
      all: eventFilteredBookings.length,
      paid,
      partiallyPaid,
      pending,
      complimentary
    };
  }, [eventFilteredBookings]);

  // Final filtered bookings with status filter applied
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') {
      return eventFilteredBookings;
    }

    return eventFilteredBookings.filter(booking => {
      const isComp = booking.payment_method?.toLowerCase() === 'complimentary';
      if (statusFilter === 'complimentary') {
        return isComp;
      }
      if (isComp) {
        return false;
      }
      const s = (booking.payment_status || 'pending').toLowerCase().trim();
      if (statusFilter === 'paid') {
        return s === 'paid';
      }
      if (statusFilter === 'partially_paid') {
        return s === 'partially paid' || s === 'partially_paid' || s === 'partial';
      }
      if (statusFilter === 'pending') {
        return s === 'pending';
      }
      return s === statusFilter;
    });
  }, [eventFilteredBookings, statusFilter]);

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setEventFilter('all');
    setSalesmanFilter('all');
    setCurrentPage(1);
  };

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all' || eventFilter !== 'all' || salesmanFilter !== 'all';

  const getStatusDisplayTitle = (status: string) => {
    if (status === 'all') return 'All';
    if (status === 'paid') return 'Paid';
    if (status === 'partially_paid') return 'Partially Paid';
    if (status === 'pending') return 'Pending';
    if (status === 'complimentary') return 'Complimentary';
    return status.charAt(0).toUpperCase() + status.slice(1);
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">Manage Bookings</h1>
          <p className="text-muted-foreground text-sm">View, search, and manage all offline and online bookings.</p>
        </div>
        <Button asChild className="shadow-xs">
          <Link href="/admin/bookings/new">
            <PlusCircle className="mr-2 h-4 w-4" /> New Manual Booking
          </Link>
        </Button>
      </header>
      
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
        
        {/* Left Search, Event & Salesman Filter */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, name, email, salesman..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 h-10 text-sm"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={eventFilter} onValueChange={handleEventFilterChange}>
            <SelectTrigger className="w-full sm:w-[220px] h-10">
              <SelectValue placeholder="All Events" />
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

          <Select value={salesmanFilter} onValueChange={(val) => { setSalesmanFilter(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[190px] h-10">
              <SelectValue placeholder="All Sales Attribution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sales Attribution</SelectItem>
              <SelectItem value="direct">Direct (No Agent)</SelectItem>
              {uniqueSalesmen.map(name => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Status Filter Tabs */}
        <div className="flex items-center gap-2">
          <Tabs value={statusFilter} onValueChange={handleStatusFilterChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 sm:w-auto h-auto p-1 gap-1 bg-muted/60">
              <TabsTrigger 
                value="all" 
                className="px-3 py-1.5 text-xs font-medium"
              >
                All <span className="ml-1.5 text-muted-foreground font-mono">({statusCounts.all})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="paid" 
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 data-[state=active]:bg-background"
              >
                Paid <span className="ml-1.5 opacity-80 font-mono">({statusCounts.paid})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="partially_paid" 
                className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 data-[state=active]:bg-background"
              >
                Partially Paid <span className="ml-1.5 opacity-80 font-mono">({statusCounts.partiallyPaid})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 data-[state=active]:bg-background"
              >
                Pending <span className="ml-1.5 opacity-80 font-mono">({statusCounts.pending})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="complimentary" 
                className="px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 data-[state=active]:bg-background"
              >
                Complimentary <span className="ml-1.5 opacity-80 font-mono">({statusCounts.complimentary})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isFiltered && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <CardTitle className="text-lg">
              {getStatusDisplayTitle(statusFilter)} Bookings ({filteredBookings.length.toLocaleString()})
            </CardTitle>
            {isFiltered && (
              <span className="text-xs text-muted-foreground">
                Showing matching results for applied filter
              </span>
            )}
          </div>
          <CardDescription>
            A list of all customer and manual bookings matching the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedBookings.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <p className="font-medium text-sm text-foreground">No bookings found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isFiltered ? "No bookings match the selected filters. Try changing or resetting filters." : "No bookings recorded yet."}
              </p>
              {isFiltered && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 text-xs">
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Booking ID</TableHead>
                    <TableHead>Event &amp; Tickets</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sales Attribution</TableHead>
                    <TableHead className="w-[140px]">Payment Status</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead>Booked On</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((booking) => {
                    const rawStatus = (booking.payment_status || 'pending').toLowerCase().trim();
                    const isComplimentary = booking.payment_method?.toLowerCase() === 'complimentary';
                    const isPaid = !isComplimentary && rawStatus === 'paid';
                    const isPartiallyPaid = !isComplimentary && (rawStatus === 'partially paid' || rawStatus === 'partially_paid' || rawStatus === 'partial');
                    const isPending = !isComplimentary && rawStatus === 'pending';

                    const amountPaid = isComplimentary ? 0 : (booking.amount_paid !== undefined ? booking.amount_paid : (isPaid ? booking.totalPrice : 0));
                    const balanceDue = isComplimentary ? 0 : (booking.balance_amount !== undefined ? booking.balance_amount : Math.max(0, booking.totalPrice - amountPaid));

                    return (
                      <TableRow key={booking.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                          #{booking.id}
                          {booking.booked_type === 'manualy' && (
                            <span className="block text-[10px] text-muted-foreground font-sans font-normal">
                              Manual
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div className="font-semibold text-sm text-foreground">{booking.eventName}</div>
                          {booking.tickettype && (
                            <p className="text-xs text-muted-foreground">{booking.tickettype}</p>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium text-sm text-foreground">{booking.userName}</div>
                          <div className="text-xs text-muted-foreground">
                            {booking.billingAddress?.email || (booking.billingAddress?.phone_number ? `Tel: ${booking.billingAddress.phone_number}` : '')}
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {booking.salesman_name && booking.salesman_name.toLowerCase() !== 'direct' ? (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 font-medium text-xs py-0.5 px-2">
                              <Briefcase className="h-3 w-3 mr-1 shrink-0 inline" />
                              {booking.salesman_name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">
                              {booking.booked_type === 'online' ? 'Online' : 'Direct'}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {isComplimentary && (
                            <Badge 
                              variant="secondary"
                              className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 font-semibold text-xs px-2.5 py-0.5"
                            >
                              Complimentary
                            </Badge>
                          )}

                          {isPaid && (
                            <Badge 
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold text-xs px-2.5 py-0.5"
                            >
                              Paid
                            </Badge>
                          )}

                          {isPartiallyPaid && (
                            <div className="flex flex-col items-start gap-0.5">
                              <Badge 
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 font-semibold text-xs px-2 py-0.5"
                              >
                                Partially Paid
                              </Badge>
                              {balanceDue > 0 && (
                                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                                  Due: LKR {balanceDue.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}

                          {isPending && (
                            <Badge 
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 font-semibold text-xs px-2.5 py-0.5"
                            >
                              Pending
                            </Badge>
                          )}

                          {!isComplimentary && !isPaid && !isPartiallyPaid && !isPending && (
                            <Badge variant="outline" className="capitalize text-xs">
                              {rawStatus}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(booking.eventDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-sm">
                            {isComplimentary ? (
                              <span className="text-purple-600 dark:text-purple-400">FREE PASS</span>
                            ) : (
                              `LKR ${typeof booking.totalPrice === 'number' ? booking.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}`
                            )}
                          </div>
                          {isComplimentary ? (
                            <div className="text-[10px] text-muted-foreground line-through">
                              Val: LKR {typeof booking.totalPrice === 'number' ? booking.totalPrice.toLocaleString() : '0'}
                            </div>
                          ) : isPartiallyPaid && amountPaid > 0 && (
                            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                              Paid: LKR {amountPaid.toLocaleString()}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">
                          {new Date(booking.bookingDate).toLocaleString(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                            <Link href={`/admin/bookings/${booking.id}`}>
                              <FileText className="mr-1.5 h-3.5 w-3.5" /> Details
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
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t py-3 gap-3">
            <div className="text-xs text-muted-foreground">
              Showing <strong>{paginatedBookings.length}</strong> of <strong>{filteredBookings.length.toLocaleString()}</strong> bookings
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
