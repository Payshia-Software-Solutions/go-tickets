"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import type { Booking, Event, TicketType, Salesman } from '@/lib/types';
import { adminGetAllEvents } from '@/lib/mockData';
import { adminGetAllBookings as fetchAllBookings } from '@/lib/services/booking.service';
import { getAllSalesmen } from '@/lib/services/salesman.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TICKET_TYPES_API_URL, API_BASE_URL } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { updateBookingSalesman } from '@/lib/services/booking.service';
import {
  Award,
  Trophy,
  Medal,
  TrendingUp,
  Download,
  Printer,
  Search,
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Briefcase,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  ArrowUpDown,
  ExternalLink,
  Edit3,
} from 'lucide-react';

const BOOKING_SHOWTIMES_API_URL = `${API_BASE_URL}/booking-showtimes/`;
const BOOKING_EVENTS_API_URL = `${API_BASE_URL}/booking-events/`;

export type ComputedStatus = 'paid' | 'partially_paid' | 'pending';

export interface AttributedBooking extends Booking {
  ticketCount: number;
  ticketTypeNames: string[];
  computedStatus: ComputedStatus;
  grossAmount: number;
  collectedAmount: number;
  balanceAmount: number;
  salesmanDisplayName: string;
  salesmanCode?: string;
  salesmanKey: string; // salesman id or 'direct_counter'
  salesmanPhone?: string;
  salesmanEmail?: string;
  eventTitle: string;
  customerName: string;
  customerPhone: string;
}

export interface SalesmanStat {
  key: string;
  salesmanId?: string | number;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'unassigned';
  totalOrders: number;
  totalTickets: number;
  grossSales: number;
  collectedRevenue: number;
  balanceDue: number;
  collectionRate: number;
  fullyPaidOrders: number;
  partiallyPaidOrders: number;
  pendingOrders: number;
}

const ITEMS_PER_PAGE = 15;

export default function SalesmanPerformanceReportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [allAttributedBookings, setAllAttributedBookings] = useState<AttributedBooking[]>([]);

  // Filters
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedSalesmanKey, setSelectedSalesmanKey] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('leaderboard');
  const [sortBy, setSortBy] = useState<'gross' | 'collected' | 'tickets' | 'orders'>('gross');

  // Reassign Salesman Modal State
  const [reassignBooking, setReassignBooking] = useState<AttributedBooking | null>(null);
  const [reassignSalesmanId, setReassignSalesmanId] = useState<string>('none');
  const [isReassigning, setIsReassigning] = useState(false);

  const { toast } = useToast();

  const handleOpenReassignModal = (booking: AttributedBooking) => {
    setReassignBooking(booking);
    setReassignSalesmanId(booking.salesman_id ? String(booking.salesman_id) : 'none');
  };

  const handleConfirmReassign = async () => {
    if (!reassignBooking) return;
    setIsReassigning(true);
    try {
      const salesmanId = reassignSalesmanId === 'none' ? null : reassignSalesmanId;
      const matchedSalesman = salesmen.find((s) => String(s.id) === String(salesmanId));
      const salesmanName = matchedSalesman ? matchedSalesman.name : 'Direct';

      const res = await updateBookingSalesman(reassignBooking.id, salesmanId, salesmanName);

      // Update in allAttributedBookings state
      setAllAttributedBookings((prev) =>
        prev.map((b) => {
          if (b.id !== reassignBooking.id) return b;
          return {
            ...b,
            salesman_id: res.salesman_id,
            salesman_name: res.salesman_name,
            salesmanDisplayName: res.salesman_id ? res.salesman_name : 'Direct Counter (Unassigned)',
            salesmanCode: matchedSalesman?.code || undefined,
            salesmanKey: res.salesman_id ? String(res.salesman_id) : 'direct_counter',
            salesmanPhone: matchedSalesman?.phone || undefined,
            salesmanEmail: matchedSalesman?.email || undefined,
          };
        })
      );

      toast({
        title: 'Salesman Reassigned',
        description: `Booking #${reassignBooking.id} assigned to ${res.salesman_id ? res.salesman_name : 'Direct Counter'}.`,
      });
      setReassignBooking(null);
    } catch (err: any) {
      toast({
        title: 'Failed to Reassign',
        description: err.message || 'An error occurred while updating the salesman.',
        variant: 'destructive',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  const formatLKR = (amount: number) => {
    return `LKR ${Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Fetch initial master data
  const fetchData = useCallback(async () => {
    try {
      const [
        eventsRes,
        salesmenRes,
        rawBookings,
        bookedShowtimesRes,
        ticketTypesRes,
        bookingEventsRes,
      ] = await Promise.all([
        adminGetAllEvents().catch(() => []),
        getAllSalesmen().catch(() => []),
        fetchAllBookings().catch(() => []),
        fetch(BOOKING_SHOWTIMES_API_URL).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(TICKET_TYPES_API_URL).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(BOOKING_EVENTS_API_URL).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);

      const safeEvents: Event[] = Array.isArray(eventsRes) ? eventsRes : [];
      const safeSalesmen: Salesman[] = Array.isArray(salesmenRes) ? salesmenRes : [];
      const safeRawBookings: Booking[] = Array.isArray(rawBookings) ? rawBookings : [];
      const safeShowtimes = Array.isArray(bookedShowtimesRes) ? bookedShowtimesRes : [];
      const safeTicketTypes = Array.isArray(ticketTypesRes) ? ticketTypesRes : [];

      setEvents(safeEvents);
      setSalesmen(safeSalesmen);

      // Pre-map booking to event ID from booking-events API
      const bookingEventMap = new Map<string, string>();
      if (Array.isArray(bookingEventsRes)) {
        bookingEventsRes.forEach((link: any) => {
          const bId = String(link.booking_id || link.bookingId || '');
          const evId = String(link.eventId || link.event_id || '');
          if (bId && evId) {
            bookingEventMap.set(bId, evId);
          }
        });
      }

      // Pre-index showtimes by booking id
      const showtimeMap = new Map<string, { count: number; types: string[]; eventId?: string }>();
      safeShowtimes.forEach((st: any) => {
        const bId = String(st.booking_id || st.bookingId || '');
        const qty = parseInt(st.ticket_count, 10) || 0;
        const tt = safeTicketTypes.find((t: any) => String(t.id) === String(st.tickettype_id || st.ticketTypeId));
        const typeName = tt?.name || `Ticket #${st.tickettype_id || st.ticketTypeId}`;
        const evId = String(st.eventId || st.event_id || '');

        const existing = showtimeMap.get(bId) || { count: 0, types: [] as string[], eventId: evId };
        existing.count += qty;
        if (!existing.types.includes(typeName)) {
          existing.types.push(typeName);
        }
        if (!existing.eventId && evId) {
          existing.eventId = evId;
        }
        showtimeMap.set(bId, existing);

        if (bId && evId && !bookingEventMap.has(bId)) {
          bookingEventMap.set(bId, evId);
        }
      });

      // Filter and enrich bookings:
      // Include manual bookings or any booking with salesman assigned
      const manualBookings = safeRawBookings.filter((b) => 
        b.booked_type === 'manualy' || (b.salesman_id && String(b.salesman_id) !== '0' && String(b.salesman_id) !== '')
      );

      const enriched: AttributedBooking[] = manualBookings.map((b) => {
        const gross = Number(b.totalPrice || 0);
        const paid = Number(b.amount_paid || 0);
        const rawStatus = (b.payment_status || 'pending').toLowerCase();

        let computedStatus: ComputedStatus = 'pending';
        let collected = 0;
        let balance = 0;

        if (rawStatus === 'paid' || paid >= gross) {
          computedStatus = 'paid';
          collected = paid > 0 ? paid : gross;
          balance = 0;
        } else if (rawStatus === 'partially_paid' || (paid > 0 && paid < gross)) {
          computedStatus = 'partially_paid';
          collected = paid;
          balance = b.balance_amount !== undefined && Number(b.balance_amount) > 0
            ? Number(b.balance_amount)
            : Math.max(0, gross - collected);
        } else {
          computedStatus = 'pending';
          collected = paid;
          balance = Math.max(0, gross - collected);
        }

        // Ticket calculation
        const bId = String(b.id);
        const showData = showtimeMap.get(bId);
        let ticketCount = showData?.count || 0;
        if (ticketCount === 0) {
          ticketCount = Array.isArray(b.bookedTickets) && b.bookedTickets.length > 0
            ? b.bookedTickets.reduce((sum, t) => sum + (t.quantity || 0), 0)
            : 1;
        }

        const ticketTypeNames = showData?.types && showData.types.length > 0
          ? showData.types
          : Array.isArray(b.bookedTickets) && b.bookedTickets.length > 0
          ? b.bookedTickets.map((t) => t.ticketTypeName)
          : ['General Admission'];

        // Salesman resolution
        const matchedSalesman = safeSalesmen.find((s) => String(s.id) === String(b.salesman_id));
        let salesmanDisplayName = 'Direct Counter (Unassigned)';
        let salesmanKey = 'direct_counter';
        let salesmanCode = undefined;
        let salesmanPhone = undefined;
        let salesmanEmail = undefined;

        if (matchedSalesman) {
          salesmanDisplayName = matchedSalesman.name;
          salesmanKey = String(matchedSalesman.id);
          salesmanCode = matchedSalesman.code || undefined;
          salesmanPhone = matchedSalesman.phone || undefined;
          salesmanEmail = matchedSalesman.email || undefined;
        } else if (b.salesman_name && b.salesman_name.trim() !== '') {
          salesmanDisplayName = b.salesman_name.trim();
          salesmanKey = `named_${b.salesman_name.trim().toLowerCase().replace(/\s+/g, '_')}`;
        }

        // Event resolution: check bookingEventMap, showData, b.eventId, or eventName match
        let resolvedEventId = (
          bookingEventMap.get(bId) ||
          showData?.eventId ||
          (b.eventId && b.eventId !== 'N/A' ? String(b.eventId) : '') ||
          ''
        );

        if (!resolvedEventId && b.eventName) {
          const normName = b.eventName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matched = safeEvents.find((e) => {
            const eNorm = e.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normName.includes(eNorm) || eNorm.includes(normName);
          });
          if (matched) {
            resolvedEventId = String(matched.id);
          }
        }

        const matchedEvent = safeEvents.find((e) => String(e.id) === String(resolvedEventId));
        const eventTitle = matchedEvent ? matchedEvent.name : (b.eventName || `Event #${resolvedEventId || 'N/A'}`);

        // Customer details resolution
        const rawB = b as any;
        const customerName = (
          b.userName ||
          (b.billingAddress?.firstName ? `${b.billingAddress?.firstName || ''} ${b.billingAddress?.lastName || ''}`.trim() : '') ||
          rawB.name ||
          rawB.customer_name ||
          'Guest Counter'
        );
        const customerPhone = b.billingAddress?.phone_number || rawB.phone_number || rawB.phone || 'N/A';

        return {
          ...b,
          eventId: resolvedEventId,
          eventTitle,
          ticketCount,
          ticketTypeNames,
          computedStatus,
          grossAmount: gross,
          collectedAmount: collected,
          balanceAmount: balance,
          salesmanDisplayName,
          salesmanCode,
          salesmanKey,
          salesmanPhone,
          salesmanEmail,
          customerName,
          customerPhone,
        };
      });

      setAllAttributedBookings(enriched);
    } catch (error) {
      console.error('Error fetching salesman performance data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load salesman performance records.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Salesman Performance Report | Admin';
    }
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast({
      title: 'Report Refreshed',
      description: 'Salesman performance metrics updated successfully.',
    });
  };

  // Date filtering logic
  const dateInterval = useMemo(() => {
    if (!dateRange?.from) return null;
    return {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to || dateRange.from),
    };
  }, [dateRange]);

  // Filtered Bookings according to Event, Salesman, Date, and Status
  const filteredBookings = useMemo(() => {
    return allAttributedBookings.filter((b) => {
      // Event filter
      if (selectedEventId !== 'all') {
        const bEvId = String(b.eventId || '');
        const selectedEv = events.find((e) => String(e.id) === String(selectedEventId));
        const matchesEvent =
          bEvId === String(selectedEventId) ||
          Boolean(
            selectedEv &&
              ((b.eventTitle && b.eventTitle.toLowerCase().includes(selectedEv.name.toLowerCase())) ||
                (b.eventName && b.eventName.toLowerCase().includes(selectedEv.name.toLowerCase())))
          );
        if (!matchesEvent) return false;
      }

      // Salesman filter
      if (selectedSalesmanKey !== 'all') {
        if (selectedSalesmanKey === 'direct_counter') {
          if (b.salesmanKey !== 'direct_counter') return false;
        } else if (String(b.salesman_id) !== String(selectedSalesmanKey) && b.salesmanKey !== selectedSalesmanKey) {
          return false;
        }
      }

      // Date range filter
      if (dateInterval && b.bookingDate) {
        try {
          const rawDateStr = typeof b.bookingDate === 'string' ? b.bookingDate.replace(' ', 'T') : b.bookingDate;
          const bDate = new Date(rawDateStr);
          if (!isNaN(bDate.getTime()) && !isWithinInterval(bDate, dateInterval)) {
            return false;
          }
        } catch (e) {
          // If date parse fails, ignore
        }
      }

      // Payment status filter
      if (paymentStatusFilter !== 'all') {
        if (b.computedStatus !== paymentStatusFilter) return false;
      }

      return true;
    });
  }, [allAttributedBookings, selectedEventId, selectedSalesmanKey, dateInterval, paymentStatusFilter, events]);

  // Overall KPIs computed from filteredBookings
  const overallKPIs = useMemo(() => {
    let totalGross = 0;
    let totalCollected = 0;
    let totalBalance = 0;
    let totalTickets = 0;
    let totalOrders = filteredBookings.length;
    let fullyPaidCount = 0;
    let pendingBalanceCount = 0;

    filteredBookings.forEach((b) => {
      totalGross += b.grossAmount;
      totalCollected += b.collectedAmount;
      totalBalance += b.balanceAmount;
      totalTickets += b.ticketCount;
      if (b.computedStatus === 'paid') fullyPaidCount++;
      if (b.balanceAmount > 0) pendingBalanceCount++;
    });

    const realizationRate = totalGross > 0 ? (totalCollected / totalGross) * 100 : 0;

    return {
      totalGross,
      totalCollected,
      totalBalance,
      totalTickets,
      totalOrders,
      realizationRate,
      fullyPaidCount,
      pendingBalanceCount,
    };
  }, [filteredBookings]);

  // Salesman Breakdown & Leaderboard
  const salesmanStats = useMemo(() => {
    const statsMap = new Map<string, SalesmanStat>();

    // Seed registered salesmen
    salesmen.forEach((s) => {
      const key = String(s.id);
      statsMap.set(key, {
        key,
        salesmanId: s.id,
        name: s.name,
        code: s.code || undefined,
        phone: s.phone || undefined,
        email: s.email || undefined,
        status: s.status,
        totalOrders: 0,
        totalTickets: 0,
        grossSales: 0,
        collectedRevenue: 0,
        balanceDue: 0,
        collectionRate: 0,
        fullyPaidOrders: 0,
        partiallyPaidOrders: 0,
        pendingOrders: 0,
      });
    });

    // Add Direct Counter entry
    statsMap.set('direct_counter', {
      key: 'direct_counter',
      name: 'Direct Counter (No Salesman)',
      code: 'DIRECT',
      status: 'unassigned',
      totalOrders: 0,
      totalTickets: 0,
      grossSales: 0,
      collectedRevenue: 0,
      balanceDue: 0,
      collectionRate: 0,
      fullyPaidOrders: 0,
      partiallyPaidOrders: 0,
      pendingOrders: 0,
    });

    // Aggregate filtered bookings
    filteredBookings.forEach((b) => {
      let key = b.salesmanKey;
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          key,
          salesmanId: b.salesman_id || undefined,
          name: b.salesmanDisplayName,
          code: b.salesmanCode,
          phone: b.salesmanPhone,
          email: b.salesmanEmail,
          status: 'active',
          totalOrders: 0,
          totalTickets: 0,
          grossSales: 0,
          collectedRevenue: 0,
          balanceDue: 0,
          collectionRate: 0,
          fullyPaidOrders: 0,
          partiallyPaidOrders: 0,
          pendingOrders: 0,
        });
      }

      const stat = statsMap.get(key)!;
      stat.totalOrders += 1;
      stat.totalTickets += b.ticketCount;
      stat.grossSales += b.grossAmount;
      stat.collectedRevenue += b.collectedAmount;
      stat.balanceDue += b.balanceAmount;

      if (b.computedStatus === 'paid') stat.fullyPaidOrders += 1;
      else if (b.computedStatus === 'partially_paid') stat.partiallyPaidOrders += 1;
      else stat.pendingOrders += 1;
    });

    // Calculate rates and filter out registered salesmen with 0 orders if looking at filtered dates, unless 'all' is selected
    const list = Array.from(statsMap.values()).map((s) => ({
      ...s,
      collectionRate: s.grossSales > 0 ? (s.collectedRevenue / s.grossSales) * 100 : 0,
    }));

    // Sort based on sortBy
    list.sort((a, b) => {
      if (sortBy === 'gross') return b.grossSales - a.grossSales;
      if (sortBy === 'collected') return b.collectedRevenue - a.collectedRevenue;
      if (sortBy === 'tickets') return b.totalTickets - a.totalTickets;
      if (sortBy === 'orders') return b.totalOrders - a.totalOrders;
      return b.grossSales - a.grossSales;
    });

    return list;
  }, [salesmen, filteredBookings, sortBy]);

  // Top Salesman Performer (excluding direct counter if possible)
  const topPerformer = useMemo(() => {
    const validSalesmen = salesmanStats.filter((s) => s.key !== 'direct_counter' && s.grossSales > 0);
    return validSalesmen.length > 0 ? validSalesmen[0] : null;
  }, [salesmanStats]);

  // Ledger Search and Filter
  const searchedLedgerBookings = useMemo(() => {
    if (!ledgerSearch.trim()) return filteredBookings;
    const q = ledgerSearch.toLowerCase().trim();
    return filteredBookings.filter((b) => {
      const matchId = String(b.id).toLowerCase().includes(q);
      const matchCustomer = (b.customerName || '').toLowerCase().includes(q);
      const matchPhone = (b.customerPhone || '').toLowerCase().includes(q);
      const matchSalesman = (b.salesmanDisplayName || '').toLowerCase().includes(q) || (b.salesmanCode || '').toLowerCase().includes(q);
      const matchEvent = (b.eventTitle || '').toLowerCase().includes(q);
      return matchId || matchCustomer || matchPhone || matchSalesman || matchEvent;
    });
  }, [filteredBookings, ledgerSearch]);

  // Ledger Pagination
  const totalLedgerPages = Math.ceil(searchedLedgerBookings.length / ITEMS_PER_PAGE) || 1;
  const paginatedLedgerBookings = useMemo(() => {
    const start = (ledgerPage - 1) * ITEMS_PER_PAGE;
    return searchedLedgerBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [searchedLedgerBookings, ledgerPage]);

  // Reset page on filter changes
  useEffect(() => {
    setLedgerPage(1);
  }, [selectedEventId, selectedSalesmanKey, dateRange, paymentStatusFilter, ledgerSearch]);

  // Quick Action to drill down to a salesman
  const handleFilterToSalesman = (salesmanKey: string) => {
    setSelectedSalesmanKey(salesmanKey);
    setActiveTab('ledger');
    toast({
      title: 'Ledger Filtered',
      description: `Viewing orders for ${salesmanStats.find((s) => s.key === salesmanKey)?.name || 'Salesman'}.`,
    });
  };

  // CSV Export: Salesman Summary
  const handleExportSummaryCSV = () => {
    const headers = [
      'Rank',
      'Salesman Name',
      'Code',
      'Status',
      'Phone',
      'Email',
      'Orders Count',
      'Tickets Sold',
      'Gross Sales (LKR)',
      'Collected Revenue (LKR)',
      'Balance Due (LKR)',
      'Collection Efficiency (%)',
    ];

    const rows = salesmanStats.map((s, index) => [
      index + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.code || 'N/A'}"`,
      s.status,
      `"${s.phone || 'N/A'}"`,
      `"${s.email || 'N/A'}"`,
      s.totalOrders,
      s.totalTickets,
      s.grossSales.toFixed(2),
      s.collectedRevenue.toFixed(2),
      s.balanceDue.toFixed(2),
      `${s.collectionRate.toFixed(1)}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `salesman-performance-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export: Detailed Orders Ledger
  const handleExportLedgerCSV = () => {
    const headers = [
      'Booking ID',
      'Booking Date',
      'Event Name',
      'Salesman Name',
      'Salesman Code',
      'Customer Name',
      'Customer Phone',
      'Ticket Types',
      'Ticket Quantity',
      'Gross Amount (LKR)',
      'Collected (LKR)',
      'Balance Due (LKR)',
      'Payment Status',
    ];

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.bookingDate || 'N/A'}"`,
      `"${(b.eventTitle || '').replace(/"/g, '""')}"`,
      `"${(b.salesmanDisplayName || '').replace(/"/g, '""')}"`,
      `"${b.salesmanCode || 'N/A'}"`,
      `"${(b.customerName || 'N/A').replace(/"/g, '""')}"`,
      `"${(b.customerPhone || 'N/A').replace(/"/g, '""')}"`,
      `"${b.ticketTypeNames.join('; ')}"`,
      b.ticketCount,
      b.grossAmount.toFixed(2),
      b.collectedAmount.toFixed(2),
      b.balanceAmount.toFixed(2),
      b.computedStatus.toUpperCase(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `salesman-attributed-orders-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm">Loading Salesman Performance Report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* Header and Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Salesman Performance</h1>
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
              <Award className="h-3.5 w-3.5" />
              Counter Agent Analytics
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Track manual counter sales attribution, cash collection efficiency, and individual salesman volume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportSummaryCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Summary CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-border shadow-sm print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Event Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                Select Event
              </label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events (Consolidated)</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salesman Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Attributed Salesman
              </label>
              <Select value={selectedSalesmanKey} onValueChange={setSelectedSalesmanKey}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Salesmen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salesmen & Direct</SelectItem>
                  <SelectItem value="direct_counter">Direct Counter Only (No Salesman)</SelectItem>
                  {salesmen.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Date Range
                </label>
                {dateRange?.from && (
                  <button
                    type="button"
                    onClick={() => setDateRange(undefined)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-xs px-2.5",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "All Dates (Click to filter)"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="flex flex-wrap gap-1.5 pb-2.5 border-b mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => {
                        const y = subDays(new Date(), 1);
                        setDateRange({ from: startOfDay(y), to: endOfDay(y) });
                      }}
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setDateRange({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) })}
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setDateRange(undefined)}
                    >
                      All Time
                    </Button>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from || new Date()}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Payment Status
              </label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid (Advance)</SelectItem>
                  <SelectItem value="pending">Pay on Arrival / Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">GoTickets - Salesman Performance & Collection Report</h1>
        <p className="text-sm text-gray-500">
          Generated on {format(new Date(), 'PPpp')} | Filter: {selectedEventId === 'all' ? 'All Events' : events.find(e => String(e.id) === selectedEventId)?.name || 'Event'}
          {dateRange?.from ? ` | Period: ${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to || dateRange.from, 'LLL dd, y')}` : ' | Period: All Time'}
        </p>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Gross Sales */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Counter Sales
            </CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatLKR(overallKPIs.totalGross)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>{overallKPIs.totalOrders} total counter orders</span>
              <span>•</span>
              <span className="font-semibold text-foreground">{overallKPIs.totalTickets} tickets</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Cash Collected */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cash Collected
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatLKR(overallKPIs.totalCollected)}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Realization Rate</span>
                <span className="font-medium text-foreground">{overallKPIs.realizationRate.toFixed(1)}%</span>
              </div>
              <Progress value={overallKPIs.realizationRate} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Outstanding Receivables / Balance Due */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Outstanding Due
            </CardTitle>
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatLKR(overallKPIs.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallKPIs.pendingBalanceCount > 0 ? (
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {overallKPIs.pendingBalanceCount} orders awaiting payment / collection
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">All counter orders cleared</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Top Performer */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Top Salesman
            </CardTitle>
            <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {topPerformer ? (
              <>
                <div className="text-xl font-bold truncate text-foreground flex items-center gap-1.5">
                  <span>{topPerformer.name}</span>
                  {topPerformer.code && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                      {topPerformer.code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">{formatLKR(topPerformer.grossSales)}</span>
                  {' '}• {topPerformer.totalTickets} tickets ({topPerformer.collectionRate.toFixed(1)}% collected)
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground mt-1">
                No active salesman attribution found for this scope.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Leaderboard vs Detailed Orders Ledger */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2 print:hidden">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="leaderboard" className="gap-2">
              <Award className="h-4 w-4" />
              Salesman Leaderboard ({salesmanStats.filter(s => s.grossSales > 0).length})
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <Ticket className="h-4 w-4" />
              Attributed Orders Ledger ({searchedLedgerBookings.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'leaderboard' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" /> Sort by:
              </span>
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gross">Gross Sales (High to Low)</SelectItem>
                  <SelectItem value="collected">Collected Cash</SelectItem>
                  <SelectItem value="tickets">Tickets Sold</SelectItem>
                  <SelectItem value="orders">Total Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLedgerCSV}
              className="gap-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export Orders CSV
            </Button>
          )}
        </div>

        {/* TAB 1: Salesman Leaderboard & Performance Table */}
        <TabsContent value="leaderboard" className="space-y-4 m-0">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">Salesman Performance Ranking</CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive breakdown of sales, collections, and dues per representative.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                      <TableHead className="w-16 text-center font-bold">Rank</TableHead>
                      <TableHead className="font-bold">Salesman / Agent</TableHead>
                      <TableHead className="text-center font-bold">Orders</TableHead>
                      <TableHead className="text-center font-bold">Tickets Sold</TableHead>
                      <TableHead className="text-right font-bold">Gross Sales</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Cash Collected</TableHead>
                      <TableHead className="text-right font-bold text-amber-600 dark:text-amber-400">Balance Due</TableHead>
                      <TableHead className="text-center font-bold w-36">Collection Rate</TableHead>
                      <TableHead className="text-right font-bold print:hidden">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesmanStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No salesman sales found for the selected scope.
                        </TableCell>
                      </TableRow>
                    ) : (
                      salesmanStats.map((stat, idx) => {
                        const isTop1 = idx === 0 && stat.grossSales > 0 && stat.key !== 'direct_counter';
                        const isTop2 = idx === 1 && stat.grossSales > 0 && stat.key !== 'direct_counter';
                        const isTop3 = idx === 2 && stat.grossSales > 0 && stat.key !== 'direct_counter';

                        return (
                          <TableRow key={stat.key} className={cn("hover:bg-muted/40 transition-colors", stat.key === 'direct_counter' && "bg-muted/20")}>
                            {/* Rank Badge */}
                            <TableCell className="text-center font-medium">
                              {isTop1 ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 px-2">
                                  <Trophy className="h-3 w-3" /> #1
                                </Badge>
                              ) : isTop2 ? (
                                <Badge className="bg-slate-400 hover:bg-slate-500 text-white gap-1 px-2">
                                  <Medal className="h-3 w-3" /> #2
                                </Badge>
                              ) : isTop3 ? (
                                <Badge className="bg-amber-700 hover:bg-amber-800 text-white gap-1 px-2">
                                  <Award className="h-3 w-3" /> #3
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                              )}
                            </TableCell>

                            {/* Salesman Details */}
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground">{stat.name}</span>
                                  {stat.code && (
                                    <Badge variant="outline" className="font-mono text-[11px] py-0 px-1 text-muted-foreground">
                                      {stat.code}
                                    </Badge>
                                  )}
                                  {stat.status === 'inactive' && (
                                    <Badge variant="destructive" className="text-[10px] py-0 px-1">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                {(stat.phone || stat.email) && (
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                    {stat.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> {stat.phone}
                                      </span>
                                    )}
                                    {stat.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> {stat.email}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Orders Count */}
                            <TableCell className="text-center">
                              <span className="font-medium text-sm">{stat.totalOrders}</span>
                            </TableCell>

                            {/* Tickets Count */}
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-semibold text-xs">
                                {stat.totalTickets}
                              </Badge>
                            </TableCell>

                            {/* Gross Sales */}
                            <TableCell className="text-right font-medium text-sm">
                              {formatLKR(stat.grossSales)}
                            </TableCell>

                            {/* Collected */}
                            <TableCell className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {formatLKR(stat.collectedRevenue)}
                            </TableCell>

                            {/* Balance Due */}
                            <TableCell className="text-right font-semibold text-sm">
                              {stat.balanceDue > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {formatLKR(stat.balanceDue)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs font-normal">LKR 0.00</span>
                              )}
                            </TableCell>

                            {/* Collection Efficiency */}
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                  "text-xs font-bold",
                                  stat.collectionRate >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                                  stat.collectionRate >= 70 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                                )}>
                                  {stat.collectionRate.toFixed(1)}%
                                </span>
                                <Progress value={stat.collectionRate} className="w-20 h-1.5" />
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right print:hidden">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFilterToSalesman(stat.key)}
                                className="h-7 text-xs gap-1 hover:text-primary"
                                disabled={stat.totalOrders === 0}
                              >
                                View Orders
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Attributed Orders Ledger */}
        <TabsContent value="ledger" className="space-y-4 m-0">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Attributed Orders Ledger</CardTitle>
                  <CardDescription className="text-xs">
                    Individual booking receipts with ticket breakdown and balance collection tracking.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search booking, customer, phone..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  {selectedSalesmanKey !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSalesmanKey('all')}
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      Clear Salesman Filter
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                      <TableHead className="font-bold w-24">Booking #</TableHead>
                      <TableHead className="font-bold">Date & Time</TableHead>
                      <TableHead className="font-bold">Salesman</TableHead>
                      <TableHead className="font-bold">Event</TableHead>
                      <TableHead className="font-bold">Customer</TableHead>
                      <TableHead className="font-bold">Ticket Types</TableHead>
                      <TableHead className="text-center font-bold">Qty</TableHead>
                      <TableHead className="text-right font-bold">Gross</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600 dark:text-emerald-400">Collected</TableHead>
                      <TableHead className="text-right font-bold text-amber-600 dark:text-amber-400">Balance Due</TableHead>
                      <TableHead className="text-center font-bold">Status</TableHead>
                      <TableHead className="text-right font-bold print:hidden">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLedgerBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No counter bookings match the active filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLedgerBookings.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/40 transition-colors text-xs">
                          {/* Booking ID */}
                          <TableCell className="font-mono font-semibold text-primary">
                            #{b.id}
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {b.bookingDate ? (
                              <>
                                <div>{format(new Date(b.bookingDate), 'yyyy-MM-dd')}</div>
                                <div className="text-[10px] text-muted-foreground/80">{format(new Date(b.bookingDate), 'hh:mm a')}</div>
                              </>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>

                          {/* Salesman */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{b.salesmanDisplayName}</span>
                              {b.salesmanCode && (
                                <span className="text-[10px] font-mono text-muted-foreground">Code: {b.salesmanCode}</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Event */}
                          <TableCell className="max-w-[160px] truncate" title={b.eventTitle}>
                            <span className="font-medium">{b.eventTitle}</span>
                          </TableCell>

                          {/* Customer */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{b.customerName}</span>
                              {b.customerPhone && b.customerPhone !== 'N/A' && (
                                <span className="text-[10px] text-muted-foreground">{b.customerPhone}</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Ticket Types */}
                          <TableCell className="max-w-[140px] truncate" title={b.ticketTypeNames.join(', ')}>
                            {b.ticketTypeNames.join(', ')}
                          </TableCell>

                          {/* Qty */}
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-semibold">
                              {b.ticketCount}
                            </Badge>
                          </TableCell>

                          {/* Gross */}
                          <TableCell className="text-right font-medium">
                            {formatLKR(b.grossAmount)}
                          </TableCell>

                          {/* Collected */}
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatLKR(b.collectedAmount)}
                          </TableCell>

                          {/* Balance Due */}
                          <TableCell className="text-right font-semibold">
                            {b.balanceAmount > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                {formatLKR(b.balanceAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Cleared</span>
                            )}
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="text-center">
                            {b.computedStatus === 'paid' ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                Paid
                              </Badge>
                            ) : b.computedStatus === 'partially_paid' ? (
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border-blue-500/30 text-[10px] px-1.5 py-0">
                                Partial
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30 text-[10px] px-1.5 py-0">
                                Pay on Arrival
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right print:hidden">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReassignModal(b)}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary px-2"
                              title="Change / Reassign Salesman"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span className="hidden sm:inline">Change</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalLedgerPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t text-xs text-muted-foreground">
                  <div>
                    Showing {(ledgerPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(ledgerPage * ITEMS_PER_PAGE, searchedLedgerBookings.length)} of{' '}
                    {searchedLedgerBookings.length} orders
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                      disabled={ledgerPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="px-2 font-medium text-foreground">
                      Page {ledgerPage} of {totalLedgerPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                      disabled={ledgerPage === totalLedgerPages}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reassign Salesman Modal */}
      <Dialog open={!!reassignBooking} onOpenChange={(open) => { if (!open) setReassignBooking(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Reassign Salesman
            </DialogTitle>
            <DialogDescription>
              Change or assign the salesman for Booking #{reassignBooking?.id}.
            </DialogDescription>
          </DialogHeader>

          {reassignBooking && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-3 bg-muted/40 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold text-foreground">{reassignBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event:</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">{reassignBooking.eventTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Amount:</span>
                  <span className="font-mono font-semibold text-foreground">{formatLKR(reassignBooking.grossAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Salesman:</span>
                  <span className="font-semibold text-primary">{reassignBooking.salesmanDisplayName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Assign To Salesman</Label>
                <Select value={reassignSalesmanId} onValueChange={setReassignSalesmanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesman" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Direct Counter (No Salesman)</SelectItem>
                    {salesmen.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} {s.code ? `(${s.code})` : ''} {s.status === 'inactive' ? '[Inactive]' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReassignBooking(null)}
              disabled={isReassigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReassign}
              disabled={isReassigning}
              className="gap-2"
            >
              {isReassigning && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
