"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns";
import type { Booking, Event } from '@/lib/types';
import { adminGetBookingSummaries, adminGetAllEvents } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Loader2, FileText, Printer, Download, Search, Ticket, BarChart3, Star, LayoutList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { API_BASE_URL } from '@/lib/constants';

const BOOKING_SHOWTIMES_API_URL = `${API_BASE_URL}/booking-showtimes`;

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
  bookingId: string;
  eventId: string;
  eventName: string;
  ticketTypeName: string;
  quantity: number;
  paymentStatus: string;
  paymentMethod?: string;
  bookingDate: string;
}

interface EventTicketSummary {
    eventName: string;
    tickets: {
        typeName: string;
        count: number;
        paidCount: number;
        complimentaryCount: number;
    }[];
}


export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookedTypeFilter, setBookedTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [reportData, setReportData] = useState<Booking[]>([]);
  const [ticketReportData, setTicketReportData] = useState<EnrichedTicketRecord[]>([]);
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
    setTicketReportData([]);
    try {
      if (!dateRange || !dateRange.from || !dateRange.to) {
        toast({ title: "Invalid Date Range", description: "Please select a valid start and end date.", variant: "destructive" });
        return;
      }
      
      const [allBookings, allBookedShowtimesResponse] = await Promise.all([
        adminGetBookingSummaries(),
        fetch(BOOKING_SHOWTIMES_API_URL)
      ]);
      
      if (!allBookedShowtimesResponse.ok) {
          throw new Error('Failed to fetch booked ticket data from the API.');
      }
      const allBookedShowtimes: RawBookedShowtime[] = await allBookedShowtimesResponse.json();
      const bookingsMap = new Map<string, Booking>(allBookings.map(b => [b.id, b]));
      
      const filteredTickets: EnrichedTicketRecord[] = [];
      const includedBookingIds = new Set<string>();

      allBookedShowtimes.forEach(rawTicket => {
          const parentBooking = bookingsMap.get(String(rawTicket.booking_id));
          if (!parentBooking) return;

          const bookingDate = new Date(parentBooking.bookingDate);
          const isInDateRange = bookingDate >= dateRange.from! && bookingDate <= dateRange.to!;
          const isComp = (parentBooking.payment_method || '').toLowerCase() === 'complimentary';
          const rawStatus = (parentBooking.payment_status || 'pending').toLowerCase().trim();

          let statusMatch = statusFilter === 'all';
          if (statusFilter === 'complimentary') {
            statusMatch = isComp;
          } else if (statusFilter === 'paid') {
            statusMatch = !isComp && (rawStatus === 'paid');
          } else if (statusFilter === 'partially_paid') {
            statusMatch = !isComp && (rawStatus === 'partially paid' || rawStatus === 'partially_paid' || rawStatus === 'partial');
          } else if (statusFilter === 'pending') {
            statusMatch = !isComp && (rawStatus === 'pending');
          } else if (statusFilter === 'failed') {
            statusMatch = rawStatus === 'failed';
          }

          const eventMatch = eventFilter === 'all' || String(rawTicket.eventId) === eventFilter;
          const typeMatch = bookedTypeFilter === 'all' || parentBooking.booked_type === bookedTypeFilter;
          
          if (isInDateRange && statusMatch && eventMatch && typeMatch) {
            filteredTickets.push({
              bookingId: String(rawTicket.booking_id),
              eventId: String(rawTicket.eventId),
              eventName: parentBooking.eventName,
              ticketTypeName: rawTicket.ticket_type,
              quantity: parseInt(rawTicket.ticket_count, 10) || 0,
              paymentStatus: parentBooking.payment_status || 'pending',
              paymentMethod: parentBooking.payment_method || 'N/A',
              bookingDate: parentBooking.bookingDate,
            });
            includedBookingIds.add(String(rawTicket.booking_id));
          }
      });
      
      const filteredBookings = allBookings.filter(b => includedBookingIds.has(b.id));

      setReportData(filteredBookings);
      setTicketReportData(filteredTickets);
      setHasGeneratedReport(true);
      toast({ title: "Report Generated", description: `Found ${filteredBookings.length.toLocaleString()} bookings and ${filteredTickets.length.toLocaleString()} ticket line items.` });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not generate the report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const reportSummary = useMemo(() => {
    const totalBookings = reportData.length;
    let totalRevenue = 0;
    let paidBookingsCount = 0;
    let partiallyPaidCount = 0;
    let pendingCount = 0;
    let complimentaryCount = 0;
    let complimentaryWaivedValue = 0;

    reportData.forEach(booking => {
      const isComp = (booking.payment_method || '').toLowerCase() === 'complimentary';
      const s = (booking.payment_status || 'pending').toLowerCase().trim();
      const amountPaid = isComp ? 0 : (booking.amount_paid !== undefined ? booking.amount_paid : (s === 'paid' ? booking.totalPrice : 0));

      if (isComp) {
        complimentaryCount++;
        complimentaryWaivedValue += booking.totalPrice || 0;
      } else if (s === 'paid') {
        paidBookingsCount++;
        totalRevenue += booking.totalPrice || 0;
      } else if (s === 'partially paid' || s === 'partially_paid' || s === 'partial') {
        partiallyPaidCount++;
        totalRevenue += amountPaid;
      } else if (s === 'pending') {
        pendingCount++;
      }
    });

    return {
        totalBookings,
        totalSales: totalRevenue,
        paidBookings: paidBookingsCount,
        partiallyPaidBookings: partiallyPaidCount,
        pendingBookings: pendingCount,
        complimentaryBookings: complimentaryCount,
        complimentaryWaivedValue,
    };
  }, [reportData]);

  const eventTicketBreakdown = useMemo((): EventTicketSummary[] => {
    if (ticketReportData.length === 0) return [];

    const summaryMap = new Map<string, { 
      eventName: string; 
      tickets: Map<string, { total: number; paid: number; comp: number }>;
    }>();
    
    const validTickets = ticketReportData.filter(t => {
      const isComp = (t.paymentMethod || '').toLowerCase() === 'complimentary';
      const s = t.paymentStatus.toLowerCase().trim();
      return isComp || s === 'paid' || s === 'partially paid' || s === 'partially_paid';
    });

    validTickets.forEach(ticket => {
        if (!summaryMap.has(ticket.eventId)) {
            summaryMap.set(ticket.eventId, { eventName: ticket.eventName, tickets: new Map() });
        }
        const eventSummary = summaryMap.get(ticket.eventId)!;
        const current = eventSummary.tickets.get(ticket.ticketTypeName) || { total: 0, paid: 0, comp: 0 };
        const isComp = (ticket.paymentMethod || '').toLowerCase() === 'complimentary';

        current.total += ticket.quantity;
        if (isComp) {
            current.comp += ticket.quantity;
        } else {
            current.paid += ticket.quantity;
        }
        eventSummary.tickets.set(ticket.ticketTypeName, current);
    });
    
    return Array.from(summaryMap.values()).map(eventSum => ({
        eventName: eventSum.eventName,
        tickets: Array.from(eventSum.tickets.entries()).map(([typeName, counts]) => ({ 
            typeName, 
            count: counts.total,
            paidCount: counts.paid,
            complimentaryCount: counts.comp,
        })).sort((a,b) => a.typeName.localeCompare(b.typeName))
    })).sort((a,b) => a.eventName.localeCompare(b.eventName));

  }, [ticketReportData]);


  const handlePrint = () => {
      window.print();
  };
  
  const handleExport = () => {
    if (reportData.length === 0) {
        toast({ title: "No Data", description: "There is no data to export.", variant: "destructive" });
        return;
    }

    const headers = [
      "Booking ID",
      "Event Name",
      "Booking Date",
      "Event Date",
      "Attendee Name",
      "Attendee Email",
      "Attendee Phone",
      "Payment Method",
      "Payment Status",
      "Booking Type",
      "Total Price (LKR)",
      "Amount Paid (LKR)",
      "Balance Due (LKR)"
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
    reportData.forEach(booking => {
        const isComp = (booking.payment_method || '').toLowerCase() === 'complimentary';
        const rawStatus = (booking.payment_status || 'pending').toLowerCase().trim();
        const amountPaid = isComp ? 0 : (booking.amount_paid !== undefined ? booking.amount_paid : (rawStatus === 'paid' ? booking.totalPrice : 0));
        const balanceDue = isComp ? 0 : (booking.balance_amount !== undefined ? booking.balance_amount : Math.max(0, booking.totalPrice - amountPaid));

        const row = [
            escapeCsvCell(booking.id),
            escapeCsvCell(booking.eventName),
            escapeCsvCell(format(new Date(booking.bookingDate), 'yyyy-MM-dd HH:mm')),
            escapeCsvCell(format(new Date(booking.eventDate), 'yyyy-MM-dd')),
            escapeCsvCell(booking.userName),
            escapeCsvCell(booking.billingAddress?.email),
            escapeCsvCell(booking.billingAddress?.phone_number),
            escapeCsvCell(booking.payment_method || 'N/A'),
            escapeCsvCell(isComp ? 'Complimentary' : (booking.payment_status || 'pending')),
            escapeCsvCell(booking.booked_type === 'manualy' ? 'Manual' : 'Online'),
            escapeCsvCell(booking.totalPrice.toFixed(2)),
            escapeCsvCell(amountPaid.toFixed(2)),
            escapeCsvCell(balanceDue.toFixed(2))
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
    link.setAttribute("download", `bookings_report_${fromDate}_to_${toDate}.csv`);

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
            <FileText className="mr-3 h-8 w-8" /> Booking Report
        </h1>
        <p className="text-muted-foreground">Generate and view reports for event bookings.</p>
      </header>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select criteria to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range (Booking Date)</label>
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
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
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="complimentary">Complimentary / Free Pass</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="booked-type" className="text-sm font-medium">Booking Type</label>
             <Select value={bookedTypeFilter} onValueChange={setBookedTypeFilter}>
                <SelectTrigger id="booked-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="manualy">Manual</SelectItem>
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
            <Card id="printable-report-summary" className="card-print">
                <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                    <CardDescription>
                        Overview of bookings from {dateRange?.from ? format(dateRange.from, 'PPP') : ''} to {dateRange?.to ? format(dateRange.to, 'PPP') : ''}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Bookings</p>
                            <p className="text-2xl font-bold mt-1">{reportSummary.totalBookings.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Revenue Collected</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">LKR {reportSummary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Paid Bookings</p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{reportSummary.paidBookings.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Partially Paid</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{reportSummary.partiallyPaidBookings.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Free Passes</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{reportSummary.complimentaryBookings.toLocaleString()}</p>
                            {reportSummary.complimentaryWaivedValue > 0 && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                Waived: LKR {reportSummary.complimentaryWaivedValue.toLocaleString()}
                              </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {eventTicketBreakdown.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" /> Ticket Breakdown</CardTitle>
                        <CardDescription>A breakdown of tickets sold and complimentary passes issued for each event in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full">
                            {eventTicketBreakdown.map((event, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger>{event.eventName}</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2 pt-2">
                                            {event.tickets.map((ticket, ticketIndex) => (
                                                <li key={ticketIndex} className="flex justify-between items-center text-sm pl-4 pr-2 py-1.5 bg-muted/50 rounded-md">
                                                    <span><Ticket className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>{ticket.typeName}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                      {ticket.paidCount > 0 && (
                                                        <Badge variant="secondary" className="font-mono text-xs">
                                                          {ticket.paidCount.toLocaleString()} sold
                                                        </Badge>
                                                      )}
                                                      {ticket.complimentaryCount > 0 && (
                                                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 font-mono text-xs font-semibold">
                                                          {ticket.complimentaryCount.toLocaleString()} free pass{ticket.complimentaryCount > 1 ? 'es' : ''}
                                                        </Badge>
                                                      )}
                                                      {ticket.paidCount === 0 && ticket.complimentaryCount === 0 && (
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                          {ticket.count.toLocaleString()} issued
                                                        </Badge>
                                                      )}
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

            <Card id="printable-report-details" className="card-print">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Report Details</CardTitle>
                        <CardDescription>
                            A list of all individual bookings matching the filters.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0 no-print">
                        <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                        <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {reportData.length > 0 ? (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Booking ID</TableHead>
                                <TableHead>Event</TableHead>
                                <TableHead>Attendee</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Price</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map((booking) => {
                                    const isComp = (booking.payment_method || '').toLowerCase() === 'complimentary';
                                    const rawStatus = (booking.payment_status || 'pending').toLowerCase().trim();
                                    const isPartiallyPaid = rawStatus === 'partially paid' || rawStatus === 'partially_paid' || rawStatus === 'partial';

                                    return (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-mono text-xs whitespace-nowrap">#{booking.id}</TableCell>
                                            <TableCell>
                                            <div className="font-medium">{booking.eventName}</div>
                                            <div className="text-xs text-muted-foreground">{format(new Date(booking.bookingDate), 'PP')}</div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="font-medium">{booking.userName}</div>
                                                <div className="text-xs text-muted-foreground">{booking.billingAddress?.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize text-xs">
                                                    {booking.booked_type === 'manualy' ? 'Manual' : 'Online'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {booking.payment_method || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {isComp ? (
                                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 font-semibold text-xs">
                                                        Complimentary
                                                    </Badge>
                                                ) : isPartiallyPaid ? (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-semibold text-xs">
                                                        Partially Paid
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className={cn('capitalize text-xs', {
                                                        'bg-green-100 text-green-800 border-green-200': rawStatus === 'paid',
                                                        'bg-amber-100 text-amber-800 border-amber-200': rawStatus === 'pending',
                                                        'bg-red-100 text-red-800 border-red-200': rawStatus === 'failed',
                                                    })}>
                                                        {booking.payment_status || 'pending'}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {isComp ? (
                                                    <div>
                                                        <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">FREE PASS</span>
                                                        <div className="text-[10px] text-muted-foreground line-through">
                                                            Val: LKR {booking.totalPrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-sm font-semibold">
                                                        LKR {booking.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No bookings found for the selected criteria.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
