
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns";
import type { Booking, Event, TicketType } from '@/lib/types';
import { adminGetAllBookings, adminGetAllEvents } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Loader2, BookCopy, Download, Search, Ticket, DollarSign, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TICKET_TYPES_API_URL } from '@/lib/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  pricePerTicket: number; // Added for revenue calculation
}

interface EventRevenueSummary {
    eventName: string;
    tickets: {
        typeName: string;
        count: number;
        revenue: number;
    }[];
}


export default function AdminTicketReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
      
      const [allBookings, allBookedShowtimesResponse, allTicketTypesResponse] = await Promise.all([
        adminGetAllBookings(),
        fetch(BOOKING_SHOWTIMES_API_URL),
        fetch(TICKET_TYPES_API_URL)
      ]);
      
      if (!allBookedShowtimesResponse.ok) {
          throw new Error('Failed to fetch booked ticket data from the new API.');
      }
       if (!allTicketTypesResponse.ok) {
        throw new Error('Failed to fetch ticket types for pricing info.');
      }
      const allBookedShowtimes: RawBookedShowtime[] = await allBookedShowtimesResponse.json();
      const allTicketTypes: TicketType[] = await allTicketTypesResponse.json();
      const ticketPriceMap = new Map<string, number>(allTicketTypes.map(t => [String(t.id), t.price]));

      const bookingsMap = new Map<string, Booking>(allBookings.map(b => [b.id, b]));
      
      const enrichedAndFilteredTickets: EnrichedTicketRecord[] = allBookedShowtimes
        .map(rawTicket => {
            const parentBooking = bookingsMap.get(rawTicket.booking_id);
            if (!parentBooking) return null;
            
            const price = ticketPriceMap.get(rawTicket.tickettype_id);
            if (price === undefined) {
              console.warn(`Could not find price for tickettype_id: ${rawTicket.tickettype_id}. Defaulting to 0.`);
            }

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
              pricePerTicket: Number(price) || 0,
            };
        })
        .filter((ticket): ticket is EnrichedTicketRecord => {
            if (!ticket) return false;
            
            // Apply filters
            const bookingDate = new Date(ticket.bookingDate);
            const isInDateRange = bookingDate >= dateRange.from! && bookingDate <= dateRange.to!;
            const eventMatch = eventFilter === 'all' || ticket.eventId === eventFilter;
            const statusMatch = statusFilter === 'all' || ticket.paymentStatus.toLowerCase() === statusFilter;

            return isInDateRange && eventMatch && statusMatch;
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
    const paidTickets = reportData.filter(t => t.paymentStatus === 'paid');
    const totalRevenue = paidTickets.reduce((sum, ticket) => sum + (ticket.quantity * ticket.pricePerTicket), 0);
    return {
        totalTicketsSold,
        totalRevenue,
    };
  }, [reportData]);
  
  const revenueByTicketType = useMemo((): EventRevenueSummary[] => {
    const paidTickets = reportData.filter(t => t.paymentStatus === 'paid');

    const summaryMap = new Map<string, { 
        eventName: string; 
        tickets: Map<string, { count: number; revenue: number }> 
    }>();

    paidTickets.forEach(ticket => {
        if (!summaryMap.has(ticket.eventId)) {
            summaryMap.set(ticket.eventId, { 
                eventName: ticket.eventName, 
                tickets: new Map() 
            });
        }
        const eventSummary = summaryMap.get(ticket.eventId)!;

        const ticketTypeSummary = eventSummary.tickets.get(ticket.ticketTypeName) || { count: 0, revenue: 0 };
        ticketTypeSummary.count += ticket.quantity;
        ticketTypeSummary.revenue += ticket.quantity * ticket.pricePerTicket;
        eventSummary.tickets.set(ticket.ticketTypeName, ticketTypeSummary);
    });

    return Array.from(summaryMap.values()).map(eventSum => ({
        eventName: eventSum.eventName,
        tickets: Array.from(eventSum.tickets.entries()).map(([typeName, data]) => ({ 
            typeName, 
            count: data.count,
            revenue: data.revenue
        })).sort((a, b) => a.typeName.localeCompare(b.typeName))
    })).sort((a, b) => a.eventName.localeCompare(b.eventName));

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
      "Price Per Ticket (LKR)",
      "Total Price (LKR)",
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
            escapeCsvCell(ticket.pricePerTicket.toFixed(2)),
            escapeCsvCell((ticket.quantity * ticket.pricePerTicket).toFixed(2)),
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
           <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">Payment Status</label>
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2"><Ticket className="h-4 w-4"/>Total Tickets Sold</p>
                            <p className="text-2xl font-bold">{reportSummary.totalTicketsSold}</p>
                        </div>
                         <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2"><DollarSign className="h-4 w-4"/>Total Revenue (Paid)</p>
                            <p className="text-2xl font-bold">LKR {reportSummary.totalRevenue.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {revenueByTicketType.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" /> Revenue by Ticket Type</CardTitle>
                        <CardDescription>A breakdown of all 'Paid' tickets sold for each event in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full">
                            {revenueByTicketType.map((event, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger>{event.eventName}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2 pt-2">
                                            {event.tickets.map((ticket, ticketIndex) => (
                                                <li key={ticketIndex} className="flex justify-between items-center text-sm pl-4 pr-2 py-1 bg-muted/50 rounded-md">
                                                    <span className="font-medium"><Ticket className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>{ticket.typeName}</span>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-foreground">LKR {ticket.revenue.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">{ticket.count} sold</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                 </Card>
            )}

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
                    {reportData.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Ticket Type</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Attendee</TableHead>
                                <TableHead>Total Price</TableHead>
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
                                         <TableCell className="whitespace-nowrap text-right">
                                            LKR {(ticket.quantity * ticket.pricePerTicket).toFixed(2)}
                                        </TableCell>
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
        </>
      )}
    </div>
  );
}
