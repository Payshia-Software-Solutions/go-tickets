
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ClipboardCheck, Search, Ticket, Users, Percent, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminGetAllEvents } from '@/lib/mockData';
import type { VerificationLog, Event, TicketType } from '@/lib/types';
import { fetchTicketTypesForEvent } from '@/lib/services/ticket.service';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TICKET_TYPES_API_URL } from '@/lib/constants';

const VERIFICATIONS_API_URL = 'https://gotickets-server.payshia.com/tickets-verifications/';

interface TicketTypeSummary {
    id: string;
    name: string;
    verifiedCount: number;
    totalAvailable: number;
}

interface EnrichedVerificationLog extends VerificationLog {
    ticketTypeName?: string;
}

const VerificationBreakdownPage = () => {
  const [logs, setLogs] = useState<EnrichedVerificationLog[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [allTicketTypes, setAllTicketTypes] = useState<TicketType[]>([]);
  const [ticketTypesForFilter, setTicketTypesForFilter] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTicketTypes, setIsLoadingTicketTypes] = useState(false);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [verificationsResponse, eventsResponse, allTicketTypesResponse] = await Promise.all([
          fetch(VERIFICATIONS_API_URL),
          adminGetAllEvents(),
          fetch(TICKET_TYPES_API_URL)
        ]);
        
        if (!verificationsResponse.ok) throw new Error('Failed to fetch verification logs');
        if (!allTicketTypesResponse.ok) throw new Error('Failed to fetch all ticket types');
        
        const rawLogs: Omit<VerificationLog, 'eventName'>[] = await verificationsResponse.json();
        const allEvents = eventsResponse;
        const allTicketTypesData: TicketType[] = await allTicketTypesResponse.json();
        
        const eventMap = new Map(allEvents.map(e => [String(e.id), e.name]));
        const ticketTypeMap = new Map(allTicketTypesData.map(t => [String(t.id), t.name]));
        
        setAllTicketTypes(allTicketTypesData);

        const enhancedLogs = rawLogs.map(log => ({
          ...log,
          ticket_count: parseInt(String(log.ticket_count), 10) || 0,
          eventName: eventMap.get(String(log.event_id)) || `Event ID: ${log.event_id}`,
          ticketTypeName: ticketTypeMap.get(String(log.tickettype_id)) || `Type ID: ${log.tickettype_id}`,
        }));

        setLogs(enhancedLogs.sort((a,b) => new Date(b.checking_time).getTime() - new Date(a.checking_time).getTime()));
        setEvents(allEvents);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error Fetching Data",
          description: error instanceof Error ? error.message : "Could not load initial data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
        document.title = 'Verification Breakdown | GoTickets.lk Admin';
    }
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    if (eventFilter === 'all') {
      setTicketTypesForFilter([]);
      setTicketTypeFilter('all');
      return;
    }
    
    const fetchEventTicketTypes = async () => {
      setIsLoadingTicketTypes(true);
      try {
        const types = await fetchTicketTypesForEvent(eventFilter);
        setTicketTypesForFilter(types);
      } catch (error) {
        console.error("Error fetching ticket types for event:", error);
        toast({ title: "Error", description: "Could not fetch ticket types for the selected event."});
        setTicketTypesForFilter([]);
      } finally {
        setIsLoadingTicketTypes(false);
      }
    }
    fetchEventTicketTypes();
  }, [eventFilter, toast]);

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (eventFilter !== 'all') {
      filtered = filtered.filter(log => String(log.event_id) === eventFilter);
    }
    
    if (ticketTypeFilter !== 'all') {
      filtered = filtered.filter(log => String(log.tickettype_id) === ticketTypeFilter);
    }

    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(log =>
        String(log.booking_id).includes(lowercasedQuery) ||
        log.checking_by.toLowerCase().includes(lowercasedQuery) ||
        log.eventName?.toLowerCase().includes(lowercasedQuery) ||
        log.ticketTypeName?.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    return filtered;
  }, [logs, eventFilter, ticketTypeFilter, searchQuery]);

  const summary = useMemo(() => {
    const totalVerifications = filteredLogs.length;
    const totalTicketsVerified = filteredLogs.reduce((acc, log) => acc + (log.ticket_count || 0), 0);
    
    return {
        totalVerifications,
        totalTicketsVerified,
    };
  }, [filteredLogs]);

  const ticketTypeSummary = useMemo((): TicketTypeSummary[] | null => {
      if (eventFilter === 'all' || ticketTypesForFilter.length === 0) {
        return null;
      }

      const verifiedCounts = filteredLogs.reduce((acc, log) => {
          const ticketId = String(log.tickettype_id);
          acc[ticketId] = (acc[ticketId] || 0) + log.ticket_count;
          return acc;
      }, {} as Record<string, number>);

      return ticketTypesForFilter.map(tt => ({
        id: tt.id,
        name: tt.name,
        verifiedCount: verifiedCounts[tt.id] || 0,
        totalAvailable: tt.availability || 0,
      }));

  }, [filteredLogs, ticketTypesForFilter, eventFilter]);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleEventFilterChange = (value: string) => {
    setEventFilter(value);
    setTicketTypeFilter('all');
  };

  const handleTicketTypeFilterChange = (value: string) => {
    setTicketTypeFilter(value);
  }

  const handleExport = () => {
    if (filteredLogs.length === 0) {
        toast({ title: "No Data", description: "There is no data to export.", variant: "destructive" });
        return;
    }

    const headers = [
      "Log ID",
      "Event Name",
      "Ticket Type",
      "Booking ID",
      "Showtime ID",
      "Tickets Verified",
      "Checked In By",
      "Checked In Time"
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
    filteredLogs.forEach(log => {
        const row = [
            escapeCsvCell(log.id),
            escapeCsvCell(log.eventName),
            escapeCsvCell(log.ticketTypeName),
            escapeCsvCell(log.booking_id),
            escapeCsvCell(log.showtime_id),
            escapeCsvCell(log.ticket_count),
            escapeCsvCell(log.checking_by),
            escapeCsvCell(format(new Date(log.checking_time), 'yyyy-MM-dd HH:mm:ss')),
        ];
        csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const selectedEventName = events.find(e => e.id === eventFilter)?.name.replace(/\s/g, '_') || 'all_events';
    link.setAttribute("download", `verifications_log_${selectedEventName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Started", description: "Your CSV file is being downloaded." });
  };


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <ClipboardCheck className="mr-3 h-8 w-8" /> Verification Breakdown
        </h1>
        <p className="text-muted-foreground">A detailed log of all ticket check-ins.</p>
      </header>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : summary.totalVerifications}</div>
                <p className="text-xs text-muted-foreground">Total unique check-in events logged for current filters.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets Verified</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : summary.totalTicketsVerified}</div>
                <p className="text-xs text-muted-foreground">Total individual tickets admitted for current filters.</p>
            </CardContent>
        </Card>
       </div>

       <div className="flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search booking ID, checker, type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
         <Select value={eventFilter} onValueChange={handleEventFilterChange} disabled={isLoading}>
            <SelectTrigger className="w-full md:w-1/3">
                <SelectValue placeholder="Filter by event..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map(event => (
                    <SelectItem key={event.id} value={String(event.id)}>
                        {event.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Select value={ticketTypeFilter} onValueChange={handleTicketTypeFilterChange} disabled={isLoadingTicketTypes || eventFilter === 'all'}>
            <SelectTrigger className="w-full md:w-1/3">
                <SelectValue placeholder="Filter by ticket type..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Ticket Types</SelectItem>
                {isLoadingTicketTypes && <div className="p-2 text-sm text-muted-foreground flex items-center justify-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/> Loading...</div>}
                {!isLoadingTicketTypes && ticketTypesForFilter.map(tt => (
                    <SelectItem key={tt.id} value={String(tt.id)}>
                        {tt.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      {ticketTypeSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Percent className="mr-2 h-5 w-5" />
              Verification Summary by Ticket Type
            </CardTitle>
            <CardDescription>
              A breakdown of verified tickets for the selected event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTicketTypes ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading summary...</p>
              </div>
            ) : ticketTypeSummary.length === 0 ? (
                <p className="text-muted-foreground text-center">No ticket types found for this event.</p>
            ) : (
              ticketTypeSummary.map(summaryItem => {
                const percentage = summaryItem.totalAvailable > 0 ? (summaryItem.verifiedCount / summaryItem.totalAvailable) * 100 : 0;
                return (
                  <div key={summaryItem.id}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="font-medium text-foreground">{summaryItem.name}</span>
                      <span className="text-muted-foreground">
                        {summaryItem.verifiedCount} / {summaryItem.totalAvailable} verified
                      </span>
                    </div>
                    <Progress value={percentage} aria-label={`${summaryItem.name} verification progress`} />
                    <p className="text-xs text-right text-muted-foreground mt-1">{percentage.toFixed(1)}%</p>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle>Verification Logs ({filteredLogs.length})</CardTitle>
                <CardDescription>All recorded ticket check-ins matching the current filters.</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={filteredLogs.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </CardHeader>
        <CardContent>
             {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading verification logs...</p>
                </div>
             ) : filteredLogs.length === 0 ? (
                <div className="text-center py-10">
                    <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No verification logs found for the selected filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Booking ID</TableHead>
                                <TableHead>Ticket Type</TableHead>
                                <TableHead>Tickets Verified</TableHead>
                                <TableHead>Event Name</TableHead>
                                <TableHead>Checked In By</TableHead>
                                <TableHead>Checked In Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">{log.booking_id}</TableCell>
                                    <TableCell>{log.ticketTypeName}</TableCell>
                                    <TableCell className="text-center">{log.ticket_count}</TableCell>
                                    <TableCell className="font-medium">{log.eventName}</TableCell>
                                    <TableCell>{log.checking_by}</TableCell>
                                    <TableCell>{format(new Date(log.checking_time), "PPp")}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationBreakdownPage;
