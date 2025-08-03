
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Booking, Event, TicketType, VerificationLog } from '@/lib/types';
import { adminGetAllEvents, fetchEventByIdFromApi, getBookingById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Ticket, Users, BarChart3, TrendingUp, CheckCircle, Percent, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { BOOKINGS_API_URL } from '@/lib/constants';

const TICKET_TYPES_API_URL = "https://gotickets-server.payshia.com/ticket-types";
const VERIFICATIONS_API_URL = 'https://gotickets-server.payshia.com/tickets-verifications/';
const BOOKING_SHOWTIMES_API_URL = "https://gotickets-server.payshia.com/booking-showtimes";

interface ReportData {
  event: Event | null;
  bookings: Booking[];
  ticketTypes: TicketType[];
  verifications: VerificationLog[];
  bookedShowtimes: any[]; // Add this to store the new data
}

interface TicketSummary {
    typeName: string;
    sold: number;
    verified: number;
    revenue: number;
}

export default function EventSummaryReportPage() {
  const [eventFilter, setEventFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { toast } = useToast();

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

  const handleGenerateReport = async () => {
    if (!eventFilter) {
      toast({ title: "No Event Selected", description: "Please select an event to generate a report.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setReportData(null);
    try {
        const [eventRes, bookingsRes, verificationsRes, ticketTypesRes, bookedShowtimesRes] = await Promise.all([
            fetchEventByIdFromApi(eventFilter),
            fetch(`${BOOKINGS_API_URL}?eventId=${eventFilter}`).then(res => res.ok ? res.json() : []),
            fetch(`${VERIFICATIONS_API_URL}?event_id=${eventFilter}`).then(res => res.ok ? res.json() : []),
            fetch(`${TICKET_TYPES_API_URL}?eventid=${eventFilter}`).then(res => res.ok ? res.json() : []),
            fetch(BOOKING_SHOWTIMES_API_URL).then(res => res.ok ? res.json() : [])
        ]);

        const typedBookings = bookingsRes as Booking[];
        const paidBookings = typedBookings.filter(b => (b.payment_status || 'pending').toLowerCase() === 'paid');
        const paidBookingIds = new Set(paidBookings.map(b => String(b.id)));
        
        const fullPaidBookings = await Promise.all(
          paidBookings.map(b => getBookingById(b.id))
        ).then(results => results.filter((b): b is Booking => b !== undefined));
        
        const paidAndFilteredShowtimes = bookedShowtimesRes.filter((st: any) => 
            String(st.eventId) === eventFilter && paidBookingIds.has(String(st.booking_id))
        );

        setReportData({
            event: eventRes,
            bookings: fullPaidBookings,
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

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/> Recent Bookings</CardTitle>
                    <CardDescription>A list of the most recent paid bookings for this event.</CardDescription>
                </CardHeader>
                <CardContent>
                    {reportData.bookings.length === 0 ? (
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
                                    {reportData.bookings.slice(0, 10).map(booking => (
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
            </Card>
        </div>
      )}
    </div>
  );
}
