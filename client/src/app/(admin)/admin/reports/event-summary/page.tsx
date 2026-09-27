"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Booking, Event, TicketType, VerificationLog, Salesman } from '@/lib/types';
import { adminGetAllEvents, fetchEventByIdFromApi } from '@/lib/mockData';
import { adminGetAllBookings as fetchAllBookings } from '@/lib/services/booking.service';
import { getAllSalesmen } from '@/lib/services/salesman.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import {
  TrendingUp,
  BarChart3,
  Download,
  Printer,
  Search,
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gift,
  DollarSign,
  Building2,
  Globe,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Calendar,
  MapPin,
  Percent,
  Briefcase,
  Receipt,
  XCircle,
  Info,
} from 'lucide-react';
import { TICKET_TYPES_API_URL, API_BASE_URL } from '@/lib/constants';

const VERIFICATIONS_API_URL = `${API_BASE_URL}/tickets-verifications/`;
const BOOKING_SHOWTIMES_API_URL = `${API_BASE_URL}/booking-showtimes`;
const ITEMS_PER_PAGE = 10;

export type ComputedBookingStatus =
  | 'paid'
  | 'partially_paid'
  | 'manual_pending'
  | 'online_incomplete'
  | 'complimentary';

// Enriched Booking with pre-computed financial and attribution fields
export interface EnrichedBooking extends Booking {
  ticketCount: number;
  ticketTypeNames: string[];
  computedStatus: ComputedBookingStatus;
  grossAmount: number;
  collectedAmount: number;
  balanceAmount: number;
  salesmanDisplayName: string;
  salesmanCode?: string;
  channelName: 'Online' | 'Manual Counter';
}

interface ReportData {
  event: Event | null;
  allBookings: EnrichedBooking[];
  ticketTypes: TicketType[];
  verifications: VerificationLog[];
  bookedShowtimes: any[];
  salesmen: Salesman[];
}

export default function EventSummaryReportPage() {
  const [eventFilter, setEventFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');

  // Ledger Filters & Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('all');
  const [ledgerChannelFilter, setLedgerChannelFilter] = useState('all');
  const [ledgerSalesmanFilter, setLedgerSalesmanFilter] = useState('all');
  const [ledgerPage, setLedgerPage] = useState(1);

  // Verifications tab pagination
  const [verificationsPage, setVerificationsPage] = useState(1);

  // Ref for PDF capture
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Load available events
  const fetchEvents = useCallback(async () => {
    try {
      const allEvents = await adminGetAllEvents();
      setEvents(allEvents);
      if (allEvents.length > 0 && !eventFilter) {
        setEventFilter(allEvents[0].id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Could not fetch event list.', variant: 'destructive' });
    }
  }, [eventFilter, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Generate Report Handler
  const handleGenerateReport = async () => {
    if (!eventFilter) {
      toast({
        title: 'No Event Selected',
        description: 'Please select an event to generate a report.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setReportData(null);
    setLedgerPage(1);
    setVerificationsPage(1);
    setActiveTab('overview');

    try {
      const isAllEvents = eventFilter === 'all';

      const [
        eventRes,
        rawAllBookings,
        verificationsRes,
        ticketTypesRes,
        bookedShowtimesRes,
        salesmenRes,
      ] = await Promise.all([
        isAllEvents
          ? Promise.resolve({
              id: 'all',
              name: 'All Events (Consolidated Overview)',
              location: 'Multiple Event Venues',
              date: 'Full Season Report',
            } as any)
          : fetchEventByIdFromApi(eventFilter),
        fetchAllBookings(),
        fetch(isAllEvents ? VERIFICATIONS_API_URL : `${VERIFICATIONS_API_URL}?event_id=${eventFilter}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
        fetch(isAllEvents ? TICKET_TYPES_API_URL : `${TICKET_TYPES_API_URL}?eventid=${eventFilter}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
        fetch(BOOKING_SHOWTIMES_API_URL)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
        getAllSalesmen().catch(() => []),
      ]);

      const safeShowtimes = Array.isArray(bookedShowtimesRes) ? bookedShowtimesRes : [];
      const safeTicketTypes = Array.isArray(ticketTypesRes)
        ? ticketTypesRes.map((t: any) => ({ ...t, price: parseFloat(t.price) || 0 }))
        : [];
      const safeSalesmen: Salesman[] = Array.isArray(salesmenRes) ? salesmenRes : [];

      // 1. Identify which showtimes match this event (or all events)
      const eventBookingIds = new Set(
        safeShowtimes
          .filter((st: any) => isAllEvents || String(st.eventId) === String(eventFilter))
          .map((st: any) => String(st.booking_id))
      );

      // 2. Pre-index ticket quantities and types per booking
      const showtimeMap = new Map<string, { count: number; types: string[] }>();
      safeShowtimes.forEach((st: any) => {
        if (!isAllEvents && String(st.eventId) !== String(eventFilter)) return;
        const bId = String(st.booking_id);
        const qty = parseInt(st.ticket_count, 10) || 0;
        const tt = safeTicketTypes.find((t: any) => String(t.id) === String(st.tickettype_id));
        const typeName = tt?.name || `Ticket #${st.tickettype_id}`;

        const existing = showtimeMap.get(bId) || { count: 0, types: [] };
        existing.count += qty;
        if (!existing.types.includes(typeName)) {
          existing.types.push(typeName);
        }
        showtimeMap.set(bId, existing);
      });

      // 3. Filter bookings to this event (matching showtimes OR booking.eventId) and optional channel
      const filteredRawBookings = rawAllBookings.filter((b) => {
        const matchesEvent =
          isAllEvents || eventBookingIds.has(String(b.id)) || String(b.eventId) === String(eventFilter);
        const matchesChannel = channelFilter === 'all' || b.booked_type === channelFilter;
        return matchesEvent && matchesChannel;
      });

      // 4. Enrich every booking with accurate business logic:
      // - Online pending bookings = Incomplete / abandoned checkout (customer never paid, no tickets issued, not a gate receivable)
      // - Manual pending bookings = Reserved at counter / pay on arrival (real receivable for gate/counter)
      // - Partially paid = Manual advance paid, balance due at gate
      // - Paid = 100% Cleared
      // - Complimentary = 100% Waived free pass
      const enrichedBookings: EnrichedBooking[] = filteredRawBookings.map((b) => {
        const isComp =
          (b.payment_method || '').toLowerCase() === 'complimentary' ||
          (b.payment_status || '').toLowerCase() === 'complimentary';
        const rawStatus = (b.payment_status || 'pending').toLowerCase();

        let computedStatus: ComputedBookingStatus = 'online_incomplete';
        if (isComp) {
          computedStatus = 'complimentary';
        } else if (rawStatus === 'paid') {
          computedStatus = 'paid';
        } else if (rawStatus === 'partially_paid') {
          computedStatus = 'partially_paid';
        } else if (b.booked_type === 'manualy') {
          // Manual counter order pending payment (Pay on Arrival / Reserved at counter)
          computedStatus = 'manual_pending';
        } else {
          // Online checkout started by customer on web but payment was NOT completed
          computedStatus = 'online_incomplete';
        }

        const showData = showtimeMap.get(String(b.id));
        let ticketCount = showData?.count || 0;
        if (ticketCount === 0) {
          ticketCount =
            Array.isArray(b.bookedTickets) && b.bookedTickets.length > 0
              ? b.bookedTickets.reduce((sum, t) => sum + (t.quantity || 0), 0)
              : 1;
        }

        const ticketTypeNames =
          showData?.types && showData.types.length > 0
            ? showData.types
            : Array.isArray(b.bookedTickets) && b.bookedTickets.length > 0
            ? b.bookedTickets.map((t) => t.ticketTypeName)
            : ['General Admission'];

        const gross = Number(b.totalPrice || 0);
        let collected = 0;
        let balance = 0;

        if (computedStatus === 'complimentary') {
          collected = 0;
          balance = 0;
        } else if (computedStatus === 'paid') {
          collected = b.amount_paid !== undefined && b.amount_paid > 0 ? Number(b.amount_paid) : gross;
          balance = 0;
        } else if (computedStatus === 'partially_paid') {
          collected = Number(b.amount_paid || 0);
          balance =
            b.balance_amount !== undefined && Number(b.balance_amount) > 0
              ? Number(b.balance_amount)
              : Math.max(0, gross - collected);
        } else if (computedStatus === 'manual_pending') {
          // Manual counter reservation to collect at the counter/gate
          collected = Number(b.amount_paid || 0);
          balance = Math.max(0, gross - collected);
        } else {
          // online_incomplete: Customer abandoned web payment; no funds received, not an active gate receivable!
          collected = 0;
          balance = 0;
        }

        // Salesman & channel resolution
        const matchedSalesman = safeSalesmen.find((s) => String(s.id) === String(b.salesman_id));
        let salesmanDisplayName = 'Direct / Online';
        const channelName: 'Online' | 'Manual Counter' =
          b.booked_type === 'manualy' ? 'Manual Counter' : 'Online';

        if (b.booked_type === 'online') {
          salesmanDisplayName = 'Online Web Portal';
        } else if (b.salesman_name && b.salesman_name.trim() !== '') {
          salesmanDisplayName = b.salesman_name.trim();
        } else if (matchedSalesman) {
          salesmanDisplayName = matchedSalesman.name;
        } else {
          salesmanDisplayName = 'Direct Counter (No Salesman)';
        }

        return {
          ...b,
          ticketCount,
          ticketTypeNames,
          computedStatus,
          grossAmount: gross,
          collectedAmount: collected,
          balanceAmount: balance,
          salesmanDisplayName,
          salesmanCode: matchedSalesman?.code || undefined,
          channelName,
        };
      });

      // 5. Filter verifications strictly to this event
      const safeVerifications = (Array.isArray(verificationsRes) ? verificationsRes : [])
        .filter(
          (v: any) =>
            isAllEvents ||
            String(v.event_id) === String(eventFilter) ||
            eventBookingIds.has(String(v.booking_id))
        )
        .map((v: any) => ({
          ...v,
          ticket_count: parseInt(v.ticket_count, 10) || 0,
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.checking_time).getTime() - new Date(a.checking_time).getTime()
        );

      setReportData({
        event: eventRes,
        allBookings: enrichedBookings.sort(
          (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
        ),
        ticketTypes: safeTicketTypes,
        verifications: safeVerifications,
        bookedShowtimes: safeShowtimes.filter(
          (st: any) => isAllEvents || String(st.eventId) === String(eventFilter)
        ),
        salesmen: safeSalesmen,
      });

      toast({
        title: 'Report Generated',
        description: `Comprehensive audit loaded for ${eventRes?.name || 'Selected Event'}.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper currency formatter
  const formatLKR = (val: number) =>
    `LKR ${Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // ==========================================
  // 1. KPI Totals & High-Level Metrics
  // ==========================================
  const reportTotals = useMemo(() => {
    if (!reportData) {
      return {
        confirmedBookings: 0,
        onlineConfirmedBookings: 0,
        manualBookings: 0,
        onlineIncompleteBookings: 0,
        totalBookings: 0,
        confirmedTickets: 0,
        paidTickets: 0,
        complimentaryTickets: 0,
        incompleteTickets: 0,
        totalRevenue: 0,
        collectedRevenue: 0,
        haveToCollectRevenue: 0,
        waivedRevenue: 0,
        incompleteAttemptedRevenue: 0,
        collectionRate: 0,
        totalVerified: 0,
        totalUnverified: 0,
        checkInRate: 0,
      };
    }

    let confirmedBookings = 0;
    let onlineConfirmedBookings = 0;
    let manualBookings = 0;
    let onlineIncompleteBookings = 0;

    let confirmedTickets = 0;
    let paidTickets = 0;
    let complimentaryTickets = 0;
    let incompleteTickets = 0;

    let totalRevenue = 0; // Confirmed gross commercial value
    let collectedRevenue = 0;
    let haveToCollectRevenue = 0; // Real receivables at counter/gate
    let waivedRevenue = 0;
    let incompleteAttemptedRevenue = 0; // Incomplete online checkouts value

    reportData.allBookings.forEach((b) => {
      if (b.computedStatus === 'online_incomplete') {
        onlineIncompleteBookings++;
        incompleteTickets += b.ticketCount;
        incompleteAttemptedRevenue += b.grossAmount;
      } else {
        confirmedBookings++;
        if (b.channelName === 'Online') {
          onlineConfirmedBookings++;
        } else {
          manualBookings++;
        }
        confirmedTickets += b.ticketCount;

        if (b.computedStatus === 'complimentary') {
          complimentaryTickets += b.ticketCount;
          waivedRevenue += b.grossAmount;
        } else {
          paidTickets += b.ticketCount;
          totalRevenue += b.grossAmount;
          collectedRevenue += b.collectedAmount;
          haveToCollectRevenue += b.balanceAmount;
        }
      }
    });

    const totalVerified = reportData.verifications.reduce(
      (sum, v) => sum + (v.ticket_count || 0),
      0
    );
    const totalUnverified = Math.max(0, confirmedTickets - totalVerified);
    const checkInRate = confirmedTickets > 0 ? (totalVerified / confirmedTickets) * 100 : 0;
    const collectionRate = totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0;

    return {
      confirmedBookings,
      onlineConfirmedBookings,
      manualBookings,
      onlineIncompleteBookings,
      totalBookings: reportData.allBookings.length,
      confirmedTickets,
      paidTickets,
      complimentaryTickets,
      incompleteTickets,
      totalRevenue,
      collectedRevenue,
      haveToCollectRevenue,
      waivedRevenue,
      incompleteAttemptedRevenue,
      collectionRate,
      totalVerified,
      totalUnverified,
      checkInRate,
    };
  }, [reportData]);

  // ==========================================
  // 2. Payment Status Breakdown Summary
  // ==========================================
  const paymentStatusSummary = useMemo(() => {
    if (!reportData) return [];

    const configs: Array<{
      status: ComputedBookingStatus;
      label: string;
      description: string;
      isConfirmed: boolean;
    }> = [
      {
        status: 'paid',
        label: 'Paid in Full',
        description: 'Confirmed & 100% Cleared',
        isConfirmed: true,
      },
      {
        status: 'partially_paid',
        label: 'Partially Paid (Advance Deposit)',
        description: 'Advance received; balance due at counter/gate',
        isConfirmed: true,
      },
      {
        status: 'manual_pending',
        label: 'Manual Reserved / Pay on Arrival',
        description: 'Reserved at counter; full payment due at gate',
        isConfirmed: true,
      },
      {
        status: 'complimentary',
        label: 'Complimentary Free Passes',
        description: 'Free VIP / Guest passes; 100% waived',
        isConfirmed: true,
      },
      {
        status: 'online_incomplete',
        label: 'Incomplete Online Checkouts (Payment Not Done)',
        description: 'Abandoned web payment; unconfirmed & no tickets issued',
        isConfirmed: false,
      },
    ];

    return configs.map((cfg) => {
      const subset = reportData.allBookings.filter((b) => b.computedStatus === cfg.status);
      const count = subset.length;
      const tickets = subset.reduce((sum, b) => sum + b.ticketCount, 0);
      const grossAmount = subset.reduce((sum, b) => sum + b.grossAmount, 0);
      const collectedAmount = subset.reduce((sum, b) => sum + b.collectedAmount, 0);
      const balanceAmount = subset.reduce((sum, b) => sum + b.balanceAmount, 0);

      return {
        status: cfg.status,
        label: cfg.label,
        description: cfg.description,
        isConfirmed: cfg.isConfirmed,
        count,
        tickets,
        grossAmount,
        collectedAmount,
        balanceAmount,
      };
    });
  }, [reportData]);

  // ==========================================
  // 3. Sales Attribution & Salesman Breakdown (Confirmed only)
  // ==========================================
  const salesmanSummary = useMemo(() => {
    if (!reportData) return [];

    const map = new Map<
      string,
      {
        name: string;
        code?: string;
        channel: 'Online' | 'Manual Counter';
        bookingsCount: number;
        ticketsCount: number;
        grossRevenue: number;
        collectedRevenue: number;
        balanceDue: number;
      }
    >();

    reportData.allBookings.forEach((b) => {
      // Ignore online incomplete checkout sessions from sales performance
      if (b.computedStatus === 'online_incomplete') return;

      const key =
        b.channelName === 'Online'
          ? 'online'
          : b.salesman_id
          ? `salesman_${b.salesman_id}`
          : 'direct_counter';

      const existing = map.get(key) || {
        name: b.salesmanDisplayName,
        code: b.salesmanCode,
        channel: b.channelName,
        bookingsCount: 0,
        ticketsCount: 0,
        grossRevenue: 0,
        collectedRevenue: 0,
        balanceDue: 0,
      };

      existing.bookingsCount++;
      existing.ticketsCount += b.ticketCount;

      if (b.computedStatus !== 'complimentary') {
        existing.grossRevenue += b.grossAmount;
        existing.collectedRevenue += b.collectedAmount;
        existing.balanceDue += b.balanceAmount;
      }
      map.set(key, existing);
    });

    return Array.from(map.entries())
      .map(([key, data]) => ({
        key,
        ...data,
        collectionRate:
          data.grossRevenue > 0 ? (data.collectedRevenue / data.grossRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.grossRevenue - a.grossRevenue);
  }, [reportData]);

  // ==========================================
  // 4. Ticket Tier Performance Breakdown (Confirmed only)
  // ==========================================
  const ticketTypeSummary = useMemo(() => {
    if (!reportData) return [];

    const typeMap = new Map<
      string,
      {
        name: string;
        price: number;
        soldCount: number;
        complimentaryCount: number;
        verifiedCount: number;
        revenue: number;
      }
    >();

    reportData.ticketTypes.forEach((tt) => {
      typeMap.set(String(tt.id), {
        name: tt.name,
        price: tt.price,
        soldCount: 0,
        complimentaryCount: 0,
        verifiedCount: 0,
        revenue: 0,
      });
    });

    const bookingMap = new Map(reportData.allBookings.map((b) => [String(b.id), b]));

    reportData.bookedShowtimes.forEach((st) => {
      const parentBooking = bookingMap.get(String(st.booking_id));
      // Skip abandoned online checkouts from confirmed ticket type metrics
      if (parentBooking?.computedStatus === 'online_incomplete') return;

      const ttId = String(st.tickettype_id);
      const qty = parseInt(st.ticket_count, 10) || 0;
      let record = typeMap.get(ttId);

      if (!record) {
        record = {
          name: `Ticket #${ttId}`,
          price: 0,
          soldCount: 0,
          complimentaryCount: 0,
          verifiedCount: 0,
          revenue: 0,
        };
        typeMap.set(ttId, record);
      }

      if (parentBooking?.computedStatus === 'complimentary') {
        record.complimentaryCount += qty;
      } else {
        record.soldCount += qty;
        record.revenue += qty * record.price;
      }
    });

    reportData.verifications.forEach((v) => {
      const ttId = String(v.tickettype_id);
      const record = typeMap.get(ttId);
      if (record) {
        record.verifiedCount += v.ticket_count || 0;
      }
    });

    return Array.from(typeMap.entries())
      .map(([id, data]) => {
        const totalIssued = data.soldCount + data.complimentaryCount;
        const checkInRate = totalIssued > 0 ? (data.verifiedCount / totalIssued) * 100 : 0;
        return {
          id,
          ...data,
          totalIssued,
          checkInRate,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [reportData]);

  // ==========================================
  // 5. Filtered & Paginated Bookings Ledger
  // ==========================================
  const filteredBookings = useMemo(() => {
    if (!reportData) return [];

    return reportData.allBookings.filter((b) => {
      // Status filter
      if (ledgerStatusFilter !== 'all') {
        if (ledgerStatusFilter === 'confirmed') {
          if (b.computedStatus === 'online_incomplete') return false;
        } else if (b.computedStatus !== ledgerStatusFilter) {
          return false;
        }
      }
      // Channel filter
      if (ledgerChannelFilter !== 'all' && b.booked_type !== ledgerChannelFilter) {
        return false;
      }
      // Salesman filter
      if (ledgerSalesmanFilter !== 'all') {
        if (ledgerSalesmanFilter === 'online' && b.booked_type !== 'online') return false;
        if (ledgerSalesmanFilter === 'direct_counter' && (b.booked_type !== 'manualy' || b.salesman_id))
          return false;
        if (
          ledgerSalesmanFilter.startsWith('salesman_') &&
          String(b.salesman_id) !== ledgerSalesmanFilter.replace('salesman_', '')
        )
          return false;
      }
      // Search filter
      if (ledgerSearch.trim() !== '') {
        const query = ledgerSearch.toLowerCase();
        const matchesId = String(b.id).toLowerCase().includes(query);
        const matchesName = (b.userName || '').toLowerCase().includes(query);
        const matchesEmail = (b.billingAddress?.email || b.email || '').toLowerCase().includes(query);
        const matchesPhone = (b.billingAddress?.phone_number || '').toLowerCase().includes(query);
        const matchesSalesman = (b.salesmanDisplayName || '').toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesEmail && !matchesPhone && !matchesSalesman) {
          return false;
        }
      }
      return true;
    });
  }, [
    reportData,
    ledgerSearch,
    ledgerStatusFilter,
    ledgerChannelFilter,
    ledgerSalesmanFilter,
  ]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (ledgerPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBookings, ledgerPage]);

  const totalLedgerPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE) || 1;

  // Paginated Verifications
  const paginatedVerifications = useMemo(() => {
    if (!reportData) return [];
    const startIndex = (verificationsPage - 1) * ITEMS_PER_PAGE;
    return reportData.verifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [reportData, verificationsPage]);

  const totalVerificationsPages = reportData
    ? Math.ceil(reportData.verifications.length / ITEMS_PER_PAGE) || 1
    : 1;

  // ==========================================
  // 6. PDF Export Handler
  // ==========================================
  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    setIsDownloadingPdf(true);
    toast({
      title: 'Generating PDF...',
      description: 'Rendering high-resolution executive audit report. Please wait...',
    });

    try {
      const element = printContainerRef.current;

      const dataUrl = await htmlToImage.toPng(element, {
        cacheBust: true,
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = pdfWidth;
      const imgHeight = (img.height * pdfWidth) / img.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Extra Pages
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const eventSlug = (reportData?.event?.name || 'Event')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const dateStamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      pdf.save(`GoTickets_Audit_Report_${eventSlug}_${dateStamp}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Your official Event Summary Report has been saved.',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export PDF directly. You can use the Print button to Save as PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header section (Hidden when printing) */}
      <header className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <TrendingUp className="mr-3 h-8 w-8 text-primary" /> Event Performance & Financial Report
          </h1>
          <p className="text-muted-foreground text-sm">
            Audited financial breakdown, confirmed admissions, gate receivables, and salesman performance.
          </p>
        </div>

        {reportData && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-slate-300 dark:border-slate-700"
            >
              <Printer className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-300" />
              Print Report
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {isDownloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        )}
      </header>

      {/* Criteria Selection Card (Hidden on print) */}
      <Card className="no-print border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center">
            <Filter className="mr-2 h-4 w-4 text-primary" /> Report Scope & Criteria
          </CardTitle>
          <CardDescription>Select an event and channel to compile confirmed admissions and financials.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="event-select" className="text-xs font-semibold uppercase text-muted-foreground">
              Target Event
            </label>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger id="event-select" className="w-full">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events (Consolidated Overview)</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="channel-select" className="text-xs font-semibold uppercase text-muted-foreground">
              Sales Channel
            </label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger id="channel-select" className="w-full">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Channels</SelectItem>
                <SelectItem value="online">Online Web Portal</SelectItem>
                <SelectItem value="manualy">Manual Counter / Physical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading || !eventFilter}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Compiling Audit...' : 'Generate Full Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col justify-center items-center py-20 bg-card rounded-xl border border-dashed">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-base font-semibold text-foreground">Compiling Event Financial Audit...</p>
          <p className="text-xs text-muted-foreground">Reconciling confirmed admissions, gate scans, and salesman attribution.</p>
        </div>
      )}

      {/* Main Report View */}
      {reportData && !isLoading && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="no-print grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/70 rounded-lg">
            <TabsTrigger value="overview" className="py-2.5 font-medium">
              <TrendingUp className="mr-2 h-4 w-4" /> Executive Audit
            </TabsTrigger>
            <TabsTrigger value="salesmen" className="py-2.5 font-medium">
              <Briefcase className="mr-2 h-4 w-4" /> Sales Attribution ({salesmanSummary.length})
            </TabsTrigger>
            <TabsTrigger value="bookings" className="py-2.5 font-medium">
              <Receipt className="mr-2 h-4 w-4" /> Bookings Ledger ({reportData.allBookings.length})
            </TabsTrigger>
            <TabsTrigger value="verifications" className="py-2.5 font-medium">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Gate Logs ({reportData.verifications.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EXECUTIVE AUDIT & OVERVIEW (This container is also captured for the PDF) */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div
              ref={printContainerRef}
              id="printable-report"
              className="bg-card text-card-foreground p-6 sm:p-8 rounded-xl border border-border shadow-sm space-y-8"
            >
              {/* Document Header (Branded) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-border/80 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-extrabold text-2xl tracking-tight text-primary">GoTickets.lk</span>
                    <Badge variant="outline" className="text-xs font-mono uppercase bg-primary/5 text-primary border-primary/20">
                      Official Financial Audit
                    </Badge>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-headline">{reportData.event?.name}</h2>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 flex-wrap">
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3.5 w-3.5 text-accent" /> {reportData.event?.location || 'Venue N/A'}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3.5 w-3.5 text-accent" /> {reportData.event?.date ? format(new Date(reportData.event.date), 'PPP') : 'Season 2026'}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-muted-foreground shrink-0 space-y-1">
                  <p>
                    <strong className="text-foreground">Generated:</strong> {format(new Date(), 'PPpp')}
                  </p>
                  <p>
                    <strong className="text-foreground">Scope:</strong>{' '}
                    <span className="capitalize">{channelFilter === 'all' ? 'All Channels (Online + Counter)' : channelFilter}</span>
                  </p>
                  <p>
                    <strong className="text-foreground">Confirmed Orders:</strong>{' '}
                    <span className="font-bold text-foreground">{reportTotals.confirmedBookings}</span>{' '}
                    <span className="text-muted-foreground">({reportTotals.onlineIncompleteBookings} uncompleted web sessions)</span>
                  </p>
                </div>
              </div>

              {/* 6 Key Financial & Booking KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Confirmed Bookings */}
                <div className="p-4 bg-muted/60 dark:bg-muted/30 border border-border rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed Orders</span>
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground mt-1">
                    {reportTotals.confirmedBookings.toLocaleString()}
                  </p>
                  <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/50 pt-1.5">
                    <p className="flex justify-between">
                      <span>Online:</span> <strong className="text-foreground">{reportTotals.onlineConfirmedBookings}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Counter:</span> <strong className="text-foreground">{reportTotals.manualBookings}</strong>
                    </p>
                  </div>
                </div>

                {/* Confirmed Tickets Issued */}
                <div className="p-4 bg-muted/60 dark:bg-muted/30 border border-border rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tickets Issued</span>
                    <Ticket className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground mt-1">
                    {reportTotals.confirmedTickets.toLocaleString()}
                  </p>
                  <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/50 pt-1.5">
                    <p className="flex justify-between">
                      <span>Commercial:</span> <strong className="text-foreground">{reportTotals.paidTickets}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Free Pass:</span> <strong className="text-purple-600 dark:text-purple-400">{reportTotals.complimentaryTickets}</strong>
                    </p>
                  </div>
                </div>

                {/* Confirmed Gross Revenue */}
                <div className="p-4 bg-muted/60 dark:bg-muted/30 border border-border rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed Gross</span>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 truncate" title={formatLKR(reportTotals.totalRevenue)}>
                    {formatLKR(reportTotals.totalRevenue)}
                  </p>
                  <div className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-1.5">
                    <p>Total value of confirmed event orders.</p>
                  </div>
                </div>

                {/* Collected Revenue */}
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Collected</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 truncate" title={formatLKR(reportTotals.collectedRevenue)}>
                    {formatLKR(reportTotals.collectedRevenue)}
                  </p>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-2 border-t border-emerald-200/50 pt-1.5">
                    <p className="font-semibold">{reportTotals.collectionRate.toFixed(1)}% Realized</p>
                  </div>
                </div>

                {/* Have to Collect Amount (Real Gate/Counter Receivables) */}
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">To Collect</span>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 truncate" title={formatLKR(reportTotals.haveToCollectRevenue)}>
                    {formatLKR(reportTotals.haveToCollectRevenue)}
                  </p>
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-2 border-t border-amber-200/50 pt-1.5">
                    <p className="font-semibold">Counter Receivables Due</p>
                  </div>
                </div>

                {/* Gate Attendance & Check-ins */}
                <div className="p-4 bg-muted/60 dark:bg-muted/30 border border-border rounded-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Gate Check-in</span>
                    <Percent className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground mt-1">
                    {reportTotals.totalVerified.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-muted-foreground">/ {reportTotals.confirmedTickets}</span>
                  </p>
                  <div className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-1.5 space-y-1">
                    <Progress value={reportTotals.checkInRate} className="h-1.5" />
                    <p className="text-right font-semibold text-[10px] text-foreground">
                      {reportTotals.checkInRate.toFixed(1)}% Attended
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: Payment Status Breakdown (Clearly separating Confirmed Orders from Uncompleted Online Checkouts) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold flex items-center">
                    <Receipt className="mr-2 h-4 w-4 text-primary" /> Payment Status & Collections Breakdown
                  </h3>
                  <span className="text-xs text-muted-foreground">Financial Settlement & Receivables Reconciliation</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Payment Status & Category</TableHead>
                        <TableHead className="text-center font-bold">Orders</TableHead>
                        <TableHead className="text-center font-bold">Tickets</TableHead>
                        <TableHead className="text-right font-bold">Order Value</TableHead>
                        <TableHead className="text-right font-bold">Amount Collected</TableHead>
                        <TableHead className="text-right font-bold">Have To Collect (Due)</TableHead>
                        <TableHead className="text-center font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Confirmed Order Rows */}
                      {paymentStatusSummary
                        .filter((r) => r.isConfirmed)
                        .map((row) => {
                          const isPaid = row.status === 'paid';
                          const isPartial = row.status === 'partially_paid';
                          const isManualPending = row.status === 'manual_pending';
                          const isComp = row.status === 'complimentary';

                          return (
                            <TableRow key={row.status} className="hover:bg-muted/40">
                              <TableCell className="font-semibold">
                                <div className="flex items-center gap-2">
                                  {isPaid && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                                  {isPartial && <Clock className="h-4 w-4 text-amber-600 shrink-0" />}
                                  {isManualPending && <Building2 className="h-4 w-4 text-blue-600 shrink-0" />}
                                  {isComp && <Gift className="h-4 w-4 text-purple-600 shrink-0" />}
                                  <div>
                                    <p className="font-medium text-foreground">{row.label}</p>
                                    <p className="text-[11px] text-muted-foreground font-normal">{row.description}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono font-medium">
                                {row.count.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {row.tickets.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatLKR(row.grossAmount)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatLKR(row.collectedAmount)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                                {formatLKR(row.balanceAmount)}
                              </TableCell>
                              <TableCell className="text-center">
                                {isPaid && (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                                    100% Cleared
                                  </Badge>
                                )}
                                {isPartial && (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200">
                                    Advance Paid
                                  </Badge>
                                )}
                                {isManualPending && (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                                    Collect at Gate
                                  </Badge>
                                )}
                                {isComp && (
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                                    Complimentary
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                      {/* Subtotal of Confirmed Orders */}
                      <TableRow className="bg-muted/70 font-bold border-t-2 border-border">
                        <TableCell>
                          <div>
                            <span className="font-bold text-foreground">Total Confirmed Event Admissions</span>
                            <span className="block text-[11px] font-normal text-muted-foreground">
                              Orders cleared or officially reserved for admission
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {reportTotals.confirmedBookings.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {reportTotals.confirmedTickets.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {formatLKR(reportTotals.totalRevenue + reportTotals.waivedRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {formatLKR(reportTotals.collectedRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                          {formatLKR(reportTotals.haveToCollectRevenue)}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs text-muted-foreground">
                          {reportTotals.collectionRate.toFixed(1)}% Realized
                        </TableCell>
                      </TableRow>

                      {/* Incomplete / Abandoned Online Checkouts Row */}
                      {paymentStatusSummary
                        .filter((r) => !r.isConfirmed)
                        .map((row) => (
                          <TableRow key={row.status} className="bg-slate-50/70 dark:bg-slate-900/30 text-muted-foreground italic">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                                <div>
                                  <p className="font-medium text-slate-700 dark:text-slate-300 not-italic">
                                    {row.label}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground font-normal not-italic">
                                    {row.description}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono font-normal">
                              {row.count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-mono font-normal text-muted-foreground">
                              {row.tickets.toLocaleString()} (Attempted)
                            </TableCell>
                            <TableCell className="text-right font-mono font-normal text-muted-foreground">
                              {formatLKR(row.grossAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-normal text-muted-foreground">
                              LKR 0.00
                            </TableCell>
                            <TableCell className="text-right font-mono font-normal text-slate-400">
                              LKR 0.00 <span className="text-[10px] block not-italic">(Not Issued)</span>
                            </TableCell>
                            <TableCell className="text-center not-italic">
                              <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 text-[11px]">
                                Payment Not Completed
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    <strong>Accounting Note:</strong> Incomplete online checkouts represent shopping carts initiated on the web where customers did not complete payment. Because payment was never made, no tickets were issued, and they are intentionally excluded from active gate receivables and confirmed tickets.
                  </p>
                </div>
              </div>

              {/* SECTION: Sales Attribution & Salesman Performance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold flex items-center">
                    <Briefcase className="mr-2 h-4 w-4 text-primary" /> Sales Representative Attribution & Channel Performance
                  </h3>
                  <span className="text-xs text-muted-foreground">Confirmed Revenue and Collections by Sales Agent</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Representative / Channel</TableHead>
                        <TableHead className="font-bold">Channel</TableHead>
                        <TableHead className="text-center font-bold">Confirmed Orders</TableHead>
                        <TableHead className="text-center font-bold">Tickets Sold</TableHead>
                        <TableHead className="text-right font-bold">Confirmed Gross</TableHead>
                        <TableHead className="text-right font-bold">Amount Collected</TableHead>
                        <TableHead className="text-right font-bold">Have To Collect (Due)</TableHead>
                        <TableHead className="text-center font-bold">Collection %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesmanSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                            No confirmed sales recorded for the selected scope.
                          </TableCell>
                        </TableRow>
                      ) : (
                        salesmanSummary.map((agent) => (
                          <TableRow key={agent.key} className="hover:bg-muted/40">
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-2">
                                {agent.channel === 'Online' ? (
                                  <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
                                )}
                                <div>
                                  <span>{agent.name}</span>
                                  {agent.code && (
                                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                                      ({agent.code})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize font-normal">
                                {agent.channel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium">
                              {agent.bookingsCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium">
                              {agent.ticketsCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatLKR(agent.grossRevenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatLKR(agent.collectedRevenue)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                              {formatLKR(agent.balanceDue)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  agent.collectionRate >= 99
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : agent.collectionRate > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }
                              >
                                {agent.collectionRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}

                      {/* Total Salesman Row */}
                      {salesmanSummary.length > 0 && (
                        <TableRow className="bg-muted/70 font-bold border-t-2 border-border">
                          <TableCell colSpan={2}>Total Confirmed Sales Attribution</TableCell>
                          <TableCell className="text-center font-mono">
                            {salesmanSummary.reduce((s, a) => s + a.bookingsCount, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {salesmanSummary.reduce((s, a) => s + a.ticketsCount, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatLKR(salesmanSummary.reduce((s, a) => s + a.grossRevenue, 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {formatLKR(salesmanSummary.reduce((s, a) => s + a.collectedRevenue, 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                            {formatLKR(salesmanSummary.reduce((s, a) => s + a.balanceDue, 0))}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs">
                            {reportTotals.collectionRate.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* SECTION: Ticket Tier Performance Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" /> Ticket Tier Sales & Verification Progress
                  </h3>
                  <span className="text-xs text-muted-foreground">Confirmed sold tickets, complimentary passes, and gate check-in rates</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Ticket Tier</TableHead>
                        <TableHead className="text-right font-bold">Price</TableHead>
                        <TableHead className="text-center font-bold">Sold (Paid)</TableHead>
                        <TableHead className="text-center font-bold">Free Passes</TableHead>
                        <TableHead className="text-center font-bold">Total Issued</TableHead>
                        <TableHead className="text-center font-bold">Gate Scanned</TableHead>
                        <TableHead className="font-bold">Attendance Progress</TableHead>
                        <TableHead className="text-right font-bold">Gross Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketTypeSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                            No ticket types configured or found for this event.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ticketTypeSummary.map((tt) => (
                          <TableRow key={tt.id} className="hover:bg-muted/40">
                            <TableCell className="font-semibold">{tt.name}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatLKR(tt.price)}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium">
                              {tt.soldCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-mono text-purple-600 dark:text-purple-400 font-semibold">
                              {tt.complimentaryCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold">
                              {tt.totalIssued.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              {tt.verifiedCount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={tt.checkInRate} className="w-24 h-2" />
                                <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                                  {tt.checkInRate.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatLKR(tt.revenue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}

                      {/* Total Ticket Types Row */}
                      {ticketTypeSummary.length > 0 && (
                        <TableRow className="bg-muted/70 font-bold border-t-2 border-border">
                          <TableCell colSpan={2}>Total Admissions & Revenue</TableCell>
                          <TableCell className="text-center font-mono">
                            {ticketTypeSummary.reduce((s, t) => s + t.soldCount, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-mono text-purple-600 dark:text-purple-400">
                            {ticketTypeSummary.reduce((s, t) => s + t.complimentaryCount, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {reportTotals.confirmedTickets.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-mono text-emerald-600 dark:text-emerald-400">
                            {reportTotals.totalVerified.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={reportTotals.checkInRate} className="w-24 h-2" />
                              <span className="font-mono text-xs font-bold w-10 text-right">
                                {reportTotals.checkInRate.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatLKR(ticketTypeSummary.reduce((s, t) => s + t.revenue, 0))}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Document Sign-off / Print Footer */}
              <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-2">
                <p>Official Event Performance & Financial Reconciliation Document • GoTickets.lk</p>
                <p>CONFIDENTIAL • For Authorized Event Organizers & System Administrators Only</p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: DETAILED SALESMEN ATTRIBUTION */}
          <TabsContent value="salesmen" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Briefcase className="mr-2 h-5 w-5 text-primary" /> Sales Agent & Staff Performance Audit
                </CardTitle>
                <CardDescription>
                  Detailed sales volume, confirmed tickets, collections, and remaining balances attributed to each salesman and direct counter sales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sales Representative</TableHead>
                        <TableHead>Channel Type</TableHead>
                        <TableHead className="text-center">Confirmed Orders</TableHead>
                        <TableHead className="text-center">Tickets Sold</TableHead>
                        <TableHead className="text-right">Confirmed Gross</TableHead>
                        <TableHead className="text-right">Amount Collected</TableHead>
                        <TableHead className="text-right">Have To Collect (Receivables)</TableHead>
                        <TableHead className="text-center">Collection %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesmanSummary.map((s) => (
                        <TableRow key={s.key} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {s.name}
                              {s.code && (
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  {s.code}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {s.channel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">
                            {s.bookingsCount}
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">
                            {s.ticketsCount}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatLKR(s.grossRevenue)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatLKR(s.collectedRevenue)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                            {formatLKR(s.balanceDue)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                s.collectionRate >= 99
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : s.collectionRate > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-rose-50 text-rose-700 border-rose-300'
                              }
                            >
                              {s.collectionRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: COMPLETE BOOKINGS LEDGER */}
          <TabsContent value="bookings" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      <Receipt className="mr-2 h-5 w-5 text-primary" /> Event Bookings Ledger
                    </CardTitle>
                    <CardDescription>
                      Full searchable ledger of all individual bookings with customer contacts, settlement status, and salesman attribution.
                    </CardDescription>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Showing {filteredBookings.length} matching bookings
                  </div>
                </div>

                {/* Ledger Interactive Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search ID, Name, Phone..."
                      value={ledgerSearch}
                      onChange={(e) => {
                        setLedgerSearch(e.target.value);
                        setLedgerPage(1);
                      }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <Select
                    value={ledgerStatusFilter}
                    onValueChange={(val) => {
                      setLedgerStatusFilter(val);
                      setLedgerPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Records ({reportData.allBookings.length})</SelectItem>
                      <SelectItem value="confirmed">All Confirmed Only ({reportTotals.confirmedBookings})</SelectItem>
                      <SelectItem value="paid">Paid in Full</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="manual_pending">Manual Reserved (Pay at Gate)</SelectItem>
                      <SelectItem value="complimentary">Complimentary Passes</SelectItem>
                      <SelectItem value="online_incomplete">Incomplete Online Checkouts</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={ledgerChannelFilter}
                    onValueChange={(val) => {
                      setLedgerChannelFilter(val);
                      setLedgerPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="online">Online Web Portal</SelectItem>
                      <SelectItem value="manualy">Manual Counter</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={ledgerSalesmanFilter}
                    onValueChange={(val) => {
                      setLedgerSalesmanFilter(val);
                      setLedgerPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Salesmen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Attribution</SelectItem>
                      <SelectItem value="online">Online Web</SelectItem>
                      <SelectItem value="direct_counter">Direct / Counter</SelectItem>
                      {reportData.salesmen.map((sm) => (
                        <SelectItem key={sm.id} value={`salesman_${sm.id}`}>
                          {sm.name} {sm.code ? `(${sm.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID & Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Channel & Salesman</TableHead>
                        <TableHead className="text-center">Tickets</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Order Value</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Have To Collect</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No bookings match the specified criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedBookings.map((b) => (
                          <TableRow key={b.id} className="hover:bg-muted/40">
                            <TableCell>
                              <div className="font-mono text-xs font-bold text-foreground">#{b.id}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {format(new Date(b.bookingDate), 'PP')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-foreground">{b.userName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {b.billingAddress?.phone_number || b.billingAddress?.email || 'No phone'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="capitalize text-[10px]">
                                  {b.channelName}
                                </Badge>
                                <span className="text-xs text-foreground font-medium truncate max-w-[120px]" title={b.salesmanDisplayName}>
                                  {b.salesmanDisplayName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium text-xs">
                              {b.ticketCount}
                            </TableCell>
                            <TableCell className="text-center">
                              {b.computedStatus === 'paid' && (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px]">
                                  Paid
                                </Badge>
                              )}
                              {b.computedStatus === 'partially_paid' && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 text-[10px]">
                                  Partial Advance
                                </Badge>
                              )}
                              {b.computedStatus === 'manual_pending' && (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 text-[10px]">
                                  Collect at Gate
                                </Badge>
                              )}
                              {b.computedStatus === 'complimentary' && (
                                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[10px]">
                                  Free Pass
                                </Badge>
                              )}
                              {b.computedStatus === 'online_incomplete' && (
                                <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 text-[10px]">
                                  Incomplete Online
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {formatLKR(b.grossAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatLKR(b.collectedAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {b.computedStatus === 'online_incomplete' ? (
                                <span className="text-muted-foreground text-[10px] italic">LKR 0.00 (Unconfirmed)</span>
                              ) : (
                                formatLKR(b.balanceAmount)
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2">
                                <Link href={`/admin/bookings/${b.id}`}>
                                  <FileText className="mr-1 h-3.5 w-3.5" /> Details
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>

              {totalLedgerPages > 1 && (
                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    Showing page <strong>{ledgerPage}</strong> of <strong>{totalLedgerPages}</strong> (
                    {filteredBookings.length} bookings)
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                      disabled={ledgerPage === 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                      disabled={ledgerPage === totalLedgerPages}
                      className="h-8 text-xs"
                    >
                      Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          {/* TAB 4: GATE VERIFICATION LOGS */}
          <TabsContent value="verifications" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-600" /> Gate Check-in & Scan Log
                    </CardTitle>
                    <CardDescription>
                      Real-time verification log recorded by gate staff scanner devices during admission.
                    </CardDescription>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-md">
                    Total Gate Admissions: {reportTotals.totalVerified} Tickets
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Ticket Type</TableHead>
                        <TableHead className="text-center">Admissions Scanned</TableHead>
                        <TableHead>Verified By Staff</TableHead>
                        <TableHead className="text-right">Check-in Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVerifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No verification logs recorded for this event yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedVerifications.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs font-bold text-foreground">
                              #{log.booking_id}
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              {reportData.ticketTypes.find(
                                (tt) => String(tt.id) === String(log.tickettype_id)
                              )?.name || `Tier #${log.tickettype_id}`}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-emerald-600">
                              {log.ticket_count}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.checking_by || 'Gate Scanner'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {log.checking_time ? format(new Date(log.checking_time), 'PPp') : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>

              {totalVerificationsPages > 1 && (
                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    Showing page <strong>{verificationsPage}</strong> of{' '}
                    <strong>{totalVerificationsPages}</strong> ({reportData.verifications.length} total scans)
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVerificationsPage((p) => Math.max(1, p - 1))}
                      disabled={verificationsPage === 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVerificationsPage((p) => Math.min(totalVerificationsPages, p + 1))}
                      disabled={verificationsPage === totalVerificationsPages}
                      className="h-8 text-xs"
                    >
                      Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
