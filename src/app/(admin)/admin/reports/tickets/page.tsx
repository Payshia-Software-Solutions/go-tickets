
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns";
import type { Booking, Event } from '@/lib/types';
import { adminGetAllBookings, adminGetAllEvents } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Loader2, BookCopy, Download, Search, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const BOOKING_SHOWTIMES_API_URL = "https://gotickets-server.payshia.com/booking-showtimes";

interface RawBookedShowtime {
  id: string;
  booking_id: string;
  eventId: string;
  showtime_id: string;
  ticket_type: string;
  tickettype_id: string;
  showtime: string;
  ticket_count: string;
  created_at: string;
  updated_at: string;
}

interface EnrichedTicketRecord {
  id: string;
  bookingId: string;
  eventId: string;
  showtimeId: string;
  ticketTypeName: string;
  ticketTypeId: string;
  quantity: number;
  showtimeDateTime: string;
  bookingDate: string; // From parent booking
  eventName: string; // From parent booking
  attendeeName: string; // From parent booking
  attendeeEmail: string; // From parent booking
  paymentStatus: string; // From parent booking
}


export default function AdminTicketReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [eventFilter, setEventFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<EnrichedTicketRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      const allEvents = await adminGetAllEvents();
      setEvents(allEvents);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch event list for filtering." });
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportData([]);
    try {
      if (!dateRange || !dateRange.from || !dateRange.to) {
        toast({ title: "Invalid Date Range", description: "Please select a valid start and end date.", variant: "destructive" });
        return;
      }
      
      const [allBookings, allBookedShowtimesResponse] = await Promise.all([
        adminGetAllBookings(),
        fetch(BOOKING_SHOWTIMES_API_URL)
      ]);
      
      if (!allBookedShowtimesResponse.ok) {
          throw new Error('Failed to fetch booked ticket data from the new API.');
      }
      const allBookedShowtimes: RawBookedShowtime[] = await allBookedShowtimesResponse.json();

      const bookingsMap = new Map<string, Booking>(allBookings.map(b => [b.id, b]));
      
      const enrichedAndFilteredTickets: EnrichedTicketRecord[] = allBookedShowtimes
        .map(rawTicket => {
            const parentBooking = bookingsMap.get(rawTicket.booking_id);
            if (!parentBooking) return null;

            return {
              id: rawTicket.id,
              bookingId: rawTicket.booking_id,
              eventId: rawTicket.eventId,
              showtimeId: rawTicket.showtime_id,
              ticketTypeName: rawTicket.ticket_type,
              ticketTypeId: rawTicket.tickettype_id,
              quantity: parseInt(rawTicket.ticket_count, 10) || 0,
              showtimeDateTime: rawTicket.showtime,
              // Enriched data
              bookingDate: parentBooking.bookingDate,
              eventName: parentBooking.eventName,
              attendeeName: parentBooking.userName || 'N/A',
              attendeeEmail: parentBooking.billingAddress?.email || 'N/A',
              paymentStatus: parentBooking.payment_status || 'pending',
            };
        })
        .filter((ticket): ticket is EnrichedTicketRecord => {
            if (!ticket) return false;
            
            // Apply filters
            const bookingDate = new Date(ticket.bookingDate);
            const isInDateRange = bookingDate >= dateRange.from! && bookingDate <= dateRange.to!;
            const eventMatch = eventFilter === 'all' || ticket.eventId === eventFilter;

            return isInDateRange && eventMatch;
        });

      setReportData(enrichedAndFilteredTickets);
      setHasGeneratedReport(true);
      toast({ title: "Report Generated", description: `Found ${enrichedAndFilteredTickets.length} individual ticket records matching your criteria.` });
    } catch (error) {
      console.error("Error generating ticket report:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not generate the ticket report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const reportSummary = useMemo(() => {
    const totalTicketsSold = reportData.reduce((sum, ticket) => sum + ticket.quantity, 0);
    // Note: Revenue can't be calculated as the new API doesn't include price per ticket.
    return {
        totalTicketsSold,
    };
  }, [reportData]);

  const handleExport = () => {
    if (reportData.length === 0) {
        toast({ title: "No Data", description: "There is no data to export.", variant: "destructive" });
        return;
    }

    const headers = [
      "Event Name",
      "Ticket Type",
      "Quantity",
      "Booking ID",
      "Booking Date",
      "Showtime ID",
      "Attendee Name",
      "Attendee Email",
      "Payment Status",
    ];

    const escapeCsvCell = (cell: any) => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(",")];
    reportData.forEach(ticket => {
        const row = [
            escapeCsvCell(ticket.eventName),
            escapeCsvCell(ticket.ticketTypeName),
            escapeCsvCell(ticket.quantity),
            escapeCsvCell(ticket.bookingId),
            escapeCsvCell(format(new Date(ticket.bookingDate), 'yyyy-MM-dd HH:mm')),
            escapeCsvCell(ticket.showtimeId),
            escapeCsvCell(ticket.attendeeName),
            escapeCsvCell(ticket.attendeeEmail),
            escapeCsvCell(ticket.paymentStatus),
        ];
        csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end';
    link.setAttribute("download", `booked_tickets_report_${fromDate}_to_${toDate}.csv`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Started", description: "Your CSV file is being downloaded." });
  };


  return (
    <div className="space-y-8">
      <header className="no-print">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <BookCopy className="mr-3 h-8 w-8" /> Booked Ticket Report
        </h1>
        <p className="text-muted-foreground">Generate a detailed, line-by-line report of all tickets sold.</p>
      </header>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select criteria to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range (Booking Date)</label>
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))
                    ) : (<span>Pick a date range</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                </PopoverContent>
              </Popover>
          </div>
          <div className="space-y-2">
            <label htmlFor="event" className="text-sm font-medium">Event</label>
             <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger id="event" className="w-full">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleGenerateReport} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Generate Report
            </Button>
        </CardFooter>
      </Card>
      
      {hasGeneratedReport && (
        <Card id="printable-report" className="card-print">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Report Results</CardTitle>
                    <CardDescription>
                        {reportData.length} ticket line items found.
                    </CardDescription>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0 no-print">
                    <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-center">
                    <div className="p-4 bg-muted rounded-lg col-span-full">
                        <p className="text-sm text-muted-foreground">Total Tickets Sold</p>
                        <p className="text-2xl font-bold">{reportSummary.totalTicketsSold}</p>
                    </div>
                </div>

                {reportData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Ticket Type</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Attendee</TableHead>
                            <TableHead>Booking ID</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((ticket) => (
                                <TableRow key={ticket.id}>
                                    <TableCell>
                                      <div className="font-medium">{ticket.eventName}</div>
                                      <div className="text-xs text-muted-foreground">{format(new Date(ticket.bookingDate), 'PP')}</div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{ticket.ticketTypeName}</TableCell>
                                    <TableCell className="text-center">{ticket.quantity}</TableCell>
                                    <TableCell>
                                      <div className="whitespace-nowrap font-medium">{ticket.attendeeName}</div>
                                      <div className="text-xs text-muted-foreground whitespace-nowrap">{ticket.attendeeEmail}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs whitespace-nowrap">{ticket.bookingId}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn('capitalize', {
                                            'bg-green-100 text-green-800 border-green-200': ticket.paymentStatus === 'paid',
                                            'bg-amber-100 text-amber-800 border-amber-200': ticket.paymentStatus === 'pending',
                                            'bg-red-100 text-red-800 border-red-200': ticket.paymentStatus === 'failed',
                                        })}>
                                            {ticket.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Ticket className="mx-auto h-12 w-12 mb-4"/>
                        <p>No tickets found for the selected criteria.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
