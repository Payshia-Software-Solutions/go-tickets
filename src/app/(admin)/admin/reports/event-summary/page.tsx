
      
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Booking, Event, TicketType, VerificationLog } from '@/lib/types';
import { adminGetAllEvents, fetchEventByIdFromApi } from '@/lib/mockData';
import { adminGetAllBookings as fetchAllBookings } from '@/lib/services/booking.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Ticket, Users, BarChart3, TrendingUp, CheckCircle, Percent, FileText, ChevronLeft, ChevronRight, ClipboardCheck, BookCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { TICKET_TYPES_API_URL } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';


const VERIFICATIONS_API_URL = 'https://gotickets-server.payshia.com/tickets-verifications/';
const BOOKING_SHOWTIMES_API_URL = "https://gotickets-server.payshia.com/booking-showtimes";
const ITEMS_PER_PAGE = 5;


interface ReportData {
  event: Event | null;
  bookings: Booking[];
  ticketTypes: TicketType[];
  verifications: VerificationLog[];
  bookedShowtimes: any[]; 
}

interface TicketSummary {
    typeName: string;
    sold: number;
    verified: number;
    revenue: number;
}

interface EnrichedTicketRecord {
  id: string;
  bookingId: string;
  ticketTypeName: string;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  showtime: string;
}


export default function EventSummaryReportPage() {
  const [eventFilter, setEventFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPage, setCurrentPage] = useState(1);


  const fetchEvents = useCallback(async () => {
    try {
      const allEvents = await adminGetAllEvents();
      setEvents(allEvents);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch event list." });
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  useEffect(() => {
    // Reset pagination whenever the active tab changes
    setCurrentPage(1);
  }, [activeTab]);


  const handleGenerateReport = async () => {
    if (!eventFilter) {
      toast({ title: "No Event Selected", description: "Please select an event to generate a report.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setReportData(null);
    setCurrentPage(1);
    setActiveTab("overview");
    try {
        const [eventRes, allBookings, verificationsRes, ticketTypesRes, bookedShowtimesRes] = await Promise.all([
            fetchEventByIdFromApi(eventFilter),
            fetchAllBookings(),
            fetch(`${VERIFICATIONS_API_URL}?event_id=${eventFilter}`).then(res => res.ok ? res.json() : []),
            fetch(`${TICKET_TYPES_API_URL}?eventid=${eventFilter}`).then(res => res.ok ? res.json() : []),
            fetch(BOOKING_SHOWTIMES_API_URL).then(res => res.ok ? res.json() : [])
        ]);

        const allPaidBookings = allBookings.filter(b => (b.payment_status || 'pending').toLowerCase() === 'paid');
        const eventBookingIds = new Set(
            bookedShowtimesRes
                .filter((st: any) => String(st.eventId) === eventFilter)
                .map((st: any) => String(st.booking_id))
        );

        const eventPaidBookings = allPaidBookings.filter(b => eventBookingIds.has(String(b.id)));
        const paidBookingIds = new Set(eventPaidBookings.map(b => String(b.id)));
        
        const paidAndFilteredShowtimes = bookedShowtimesRes.filter((st: any) => 
            String(st.eventId) === eventFilter && paidBookingIds.has(String(st.booking_id))
        );

        setReportData({
            event: eventRes,
            bookings: eventPaidBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()),
            ticketTypes: ticketTypesRes.map((t: any) => ({...t, price: parseFloat(t.price)})),
            verifications: verificationsRes.map((v: any) => ({ ...v, ticket_count: parseInt(v.ticket_count, 10) || 0 })),
            bookedShowtimes: paidAndFilteredShowtimes,
        });

      toast({ title: "Report Generated", description: `Summary loaded for ${eventRes?.name}.` });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Error", description: "Could not generate the report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const ticketSummary = useMemo((): TicketSummary[] => {
    if (!reportData) return [];

    const summaryMap = new Map<string, Omit<TicketSummary, 'typeName'>>();

    reportData.ticketTypes.forEach(tt => {
        summaryMap.set(tt.id, { sold: 0, verified: 0, revenue: 0 });
    });

    reportData.bookedShowtimes.forEach(showtime => {
        const ticketInfo = summaryMap.get(String(showtime.tickettype_id));
        if (ticketInfo) {
            const price = reportData.ticketTypes.find(tt => tt.id === String(showtime.tickettype_id))?.price || 0;
            const quantity = parseInt(showtime.ticket_count, 10) || 0;
            ticketInfo.sold += quantity;
            ticketInfo.revenue += quantity * price;
        }
    });
    
    reportData.verifications.forEach(log => {
        const ticketInfo = summaryMap.get(String(log.tickettype_id));
        if (ticketInfo) {
            ticketInfo.verified += log.ticket_count;
        }
    });

    return Array.from(summaryMap.entries()).map(([ticketTypeId, summary]) => ({
      typeName: reportData.ticketTypes.find(tt => tt.id === ticketTypeId)?.name || 'Unknown Type',
      ...summary
    })).sort((a,b) => a.typeName.localeCompare(b.typeName));

  }, [reportData]);

  const reportTotals = useMemo(() => {
    if (!ticketSummary) return { totalRevenue: 0, totalTicketsSold: 0, totalTicketsVerified: 0 };
    return {
        totalRevenue: ticketSummary.reduce((sum, s) => sum + s.revenue, 0),
        totalTicketsSold: ticketSummary.reduce((sum, s) => sum + s.sold, 0),
        totalTicketsVerified: ticketSummary.reduce((sum, s) => sum + s.verified, 0),
    }
  }, [ticketSummary]);
  
  const enrichedTicketRecords = useMemo((): EnrichedTicketRecord[] => {
    if (!reportData) return [];
    
    const bookingMap = new Map(reportData.bookings.map(b => [b.id, b]));

    return reportData.bookedShowtimes.map((st: any) => {
      const parentBooking = bookingMap.get(String(st.booking_id));
      return {
        id: st.id,
        bookingId: String(st.booking_id),
        ticketTypeName: reportData.ticketTypes.find(tt => tt.id === String(st.tickettype_id))?.name || 'Unknown Type',
        quantity: parseInt(st.ticket_count, 10) || 0,
        attendeeName: parentBooking?.userName || 'N/A',
        attendeeEmail: parentBooking?.billingAddress?.email || 'N/A',
        showtime: format(new Date(st.showtime), 'PPp'),
      };
    }).sort((a, b) => new Date(b.showtime).getTime() - new Date(a.showtime).getTime());
  }, [reportData]);


  const paginatedBookings = useMemo(() => {
    if (!reportData) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return reportData.bookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [reportData, currentPage]);
  
  const paginatedVerifications = useMemo(() => {
    if (!reportData) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return reportData.verifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [reportData, currentPage]);
  
  const paginatedTickets = useMemo(() => {
    if (!enrichedTicketRecords) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return enrichedTicketRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [enrichedTicketRecords, currentPage]);


  const totalBookingPages = reportData ? Math.ceil(reportData.bookings.length / ITEMS_PER_PAGE) : 0;
  const totalVerificationPages = reportData ? Math.ceil(reportData.verifications.length / ITEMS_PER_PAGE) : 0;
  const totalTicketPages = enrichedTicketRecords ? Math.ceil(enrichedTicketRecords.length / ITEMS_PER_PAGE) : 0;

  let paginationContent: JSX.Element | null = null;
  if (activeTab === 'bookings' && totalBookingPages > 1) {
    paginationContent = <PaginationControls currentPage={currentPage} totalPages={totalBookingPages} onPageChange={setCurrentPage} itemCount={paginatedBookings.length} totalItems={reportData?.bookings.length || 0} itemType="bookings" />;
  } else if (activeTab === 'verifications' && totalVerificationPages > 1) {
    paginationContent = <PaginationControls currentPage={currentPage} totalPages={totalVerificationPages} onPageChange={setCurrentPage} itemCount={paginatedVerifications.length} totalItems={reportData?.verifications.length || 0} itemType="logs" />;
  } else if (activeTab === 'tickets' && totalTicketPages > 1) {
    paginationContent = <PaginationControls currentPage={currentPage} totalPages={totalTicketPages} onPageChange={setCurrentPage} itemCount={paginatedTickets.length} totalItems={enrichedTicketRecords.length || 0} itemType="tickets" />;
  }


  return (
    <div className="space-y-8">
      <header className="no-print">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <TrendingUp className="mr-3 h-8 w-8" /> Event Summary Report
        </h1>
        <p className="text-muted-foreground">Get a complete performance overview for a single event.</p>
      </header>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent>
             <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger id="event" className="w-full md:w-1/2">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
        </CardContent>
        <CardFooter>
            <Button onClick={handleGenerateReport} disabled={isLoading || !eventFilter}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Generate Report
            </Button>
        </CardFooter>
      </Card>
      
      {isLoading && (
         <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Generating summary...</p>
        </div>
      )}

      {reportData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookings">Paid Bookings</TabsTrigger>
              <TabsTrigger value="tickets">Booked Tickets</TabsTrigger>
              <TabsTrigger value="verifications">Verifications</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{reportData.event?.name}</CardTitle>
                            <CardDescription>High-level statistics for this event.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Paid Bookings</p>
                                <p className="text-2xl font-bold">{reportData.bookings.length.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Tickets Sold</p>
                                <p className="text-2xl font-bold">{reportTotals.totalTicketsSold.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Tickets Verified</p>
                                <p className="text-2xl font-bold">{reportTotals.totalTicketsVerified.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Revenue (Paid)</p>
                                <p className="text-2xl font-bold">LKR {reportTotals.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" /> Ticket Breakdown</CardTitle>
                            <CardDescription>Sales, revenue, and verification data for each ticket type.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticket Type</TableHead>
                                        <TableHead className="text-center">Sold</TableHead>
                                        <TableHead className="text-center">Verified</TableHead>
                                        <TableHead>Verification Progress</TableHead>
                                        <TableHead className="text-right">Revenue (LKR)</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {ticketSummary.map((summary, index) => {
                                        const percentage = summary.sold > 0 ? (summary.verified / summary.sold) * 100 : 0;
                                        return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{summary.typeName}</TableCell>
                                            <TableCell className="text-center">{summary.sold.toLocaleString()}</TableCell>
                                            <TableCell className="text-center">{summary.verified.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={percentage} className="w-full" />
                                                    <span className="text-xs text-muted-foreground w-12 text-right">{percentage.toFixed(0)}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{summary.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        </TableRow>
                                        );
                                    })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="bookings" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/> All Paid Bookings</CardTitle>
                        <CardDescription>A list of all paid bookings for this event.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {paginatedBookings.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No paid bookings found for this event.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Booking ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedBookings.map(booking => (
                                            <TableRow key={booking.id}>
                                                <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{booking.userName}</div>
                                                    <div className="text-xs text-muted-foreground">{booking.billingAddress?.email}</div>
                                                </TableCell>
                                                <TableCell className="text-right">LKR {booking.totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/admin/bookings/${booking.id}`}><FileText className="mr-2 h-3.5 w-3.5"/> Details</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    {paginationContent}
                </Card>
            </TabsContent>
            <TabsContent value="tickets" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><BookCopy className="mr-2 h-5 w-5"/> Booked Ticket Details</CardTitle>
                        <CardDescription>A detailed line-by-line list of all tickets sold for this event.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {paginatedTickets.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No ticket records found for this event.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Attendee</TableHead>
                                        <TableHead>Ticket Type</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead>Showtime</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedTickets.map(ticket => (
                                            <TableRow key={ticket.id}>
                                                <TableCell>
                                                    <div className="font-medium">{ticket.attendeeName}</div>
                                                    <div className="text-xs text-muted-foreground">{ticket.attendeeEmail}</div>
                                                </TableCell>
                                                <TableCell className="font-medium">{ticket.ticketTypeName}</TableCell>
                                                <TableCell className="text-center">{ticket.quantity}</TableCell>
                                                <TableCell>{ticket.showtime}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    {paginationContent}
                </Card>
            </TabsContent>
            <TabsContent value="verifications" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><ClipboardCheck className="mr-2 h-5 w-5"/> Verification Log</CardTitle>
                        <CardDescription>A log of all check-ins for this event.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {paginatedVerifications.length === 0 ? (
                             <p className="text-center text-muted-foreground py-4">No verifications found for this event.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Booking ID</TableHead>
                                        <TableHead>Ticket Type</TableHead>
                                        <TableHead className="text-center">Count</TableHead>
                                        <TableHead>Checked In By</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {paginatedVerifications.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono text-xs">{log.booking_id}</TableCell>
                                                <TableCell>{reportData.ticketTypes.find(tt => tt.id === String(log.tickettype_id))?.name || `ID: ${log.tickettype_id}`}</TableCell>
                                                <TableCell className="text-center">{log.ticket_count}</TableCell>
                                                <TableCell>{log.checking_by}</TableCell>
                                                <TableCell>{format(new Date(log.checking_time), 'PPp')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    {paginationContent}
                </Card>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Reusable Pagination Component
const PaginationControls = ({ currentPage, totalPages, onPageChange, itemCount, totalItems, itemType }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemCount: number;
  totalItems: number;
  itemType: string;
}) => (
  <CardFooter className="flex items-center justify-between border-t pt-4">
    <div className="text-xs text-muted-foreground">
      Showing <strong>{itemCount}</strong> of <strong>{totalItems.toLocaleString()}</strong> {itemType}.
    </div>
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        Next
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </CardFooter>
);

    
