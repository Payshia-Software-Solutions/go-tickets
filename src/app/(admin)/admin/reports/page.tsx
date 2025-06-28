"use client";

import { useState, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import type { Booking } from '@/lib/types';
import { adminGetAllBookings } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Loader2, FileText, Printer, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<Booking[]>([]);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportData([]);
    try {
      if (!dateRange || !dateRange.from || !dateRange.to) {
        toast({ title: "Invalid Date Range", description: "Please select a valid start and end date.", variant: "destructive" });
        return;
      }

      const allBookings = await adminGetAllBookings();

      const filteredBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.bookingDate);
        const isInDateRange = bookingDate >= dateRange.from! && bookingDate <= dateRange.to!;
        const statusMatch = statusFilter === 'all' || (booking.payment_status || 'pending').toLowerCase() === statusFilter;
        return isInDateRange && statusMatch;
      });

      setReportData(filteredBookings);
      setHasGeneratedReport(true);
      toast({ title: "Report Generated", description: `Found ${filteredBookings.length} bookings matching your criteria.` });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Error", description: "Could not generate the report.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const reportSummary = useMemo(() => {
    const totalBookings = reportData.length;
    const totalSales = reportData.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const paidBookings = reportData.filter(b => (b.payment_status || 'pending').toLowerCase() === 'paid').length;
    
    return {
        totalBookings,
        totalSales,
        paidBookings,
        pendingBookings: totalBookings - paidBookings
    };
  }, [reportData]);

  const handlePrint = () => {
      toast({ title: "Print (Mock)", description: "This would open the browser's print dialog." });
      // In a real app: window.print();
  };
  
  const handleExport = () => {
      toast({ title: "Export (Mock)", description: "This would download a CSV of the report." });
      // In a real app: implement CSV export logic here
  };


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <FileText className="mr-3 h-8 w-8" /> Booking Reports
        </h1>
        <p className="text-muted-foreground">Generate and view reports for event bookings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select criteria to generate your report.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
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
        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Report Results</CardTitle>
                    <CardDescription>
                        {reportSummary.totalBookings} bookings found from {dateRange?.from ? format(dateRange.from, 'PPP') : ''} to {dateRange?.to ? format(dateRange.to, 'PPP') : ''}.
                    </CardDescription>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                    <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-bold">{reportSummary.totalBookings}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold">LKR {reportSummary.totalSales.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Paid Bookings</p>
                        <p className="text-2xl font-bold">{reportSummary.paidBookings}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Pending/Other</p>
                        <p className="text-2xl font-bold">{reportSummary.pendingBookings}</p>
                    </div>
                </div>

                {reportData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Booking ID</TableHead>
                            <TableHead>Booking Date</TableHead>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((booking) => (
                                <TableRow key={booking.id}>
                                    <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                                    <TableCell>{format(new Date(booking.bookingDate), 'PPp')}</TableCell>
                                    <TableCell>{booking.eventName}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn('capitalize', {
                                            'bg-green-100 text-green-800': (booking.payment_status || 'pending').toLowerCase() === 'paid',
                                            'bg-amber-100 text-amber-800': (booking.payment_status || 'pending').toLowerCase() === 'pending',
                                        })}>
                                            {booking.payment_status || 'pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">LKR {booking.totalPrice.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
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
      )}
    </div>
  );
}
