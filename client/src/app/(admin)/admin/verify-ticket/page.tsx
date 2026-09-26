"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertTriangle, 
  Video, 
  VideoOff, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  MinusCircle, 
  PlusCircle, 
  RotateCcw, 
  Keyboard, 
  ScanLine,
  Gift,
  Zap,
  Camera,
  CheckCheck,
  UploadCloud,
  History,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Booking, BookedTicket } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getBookingByQrCode, getBookingById, adminGetBookingSummaries, adminGetAllEvents } from '@/lib/mockData';
import { API_BASE_URL } from '@/lib/constants';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAuth } from '@/contexts/AuthContext';

interface RecentVerificationItem {
  id: string;
  bookingId: string;
  attendeeName: string;
  eventName: string;
  ticketCount: number;
  time: string;
  isComplimentary: boolean;
}

const TicketVerificationPage = () => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isScannerStarting, setIsScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const [scannedBooking, setScannedBooking] = useState<Booking | null>(null);
  const [checkInQuantities, setCheckInQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const { toast } = useToast();

  const [manualCode, setManualCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentVerificationItem[]>([]);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const isProcessingScanRef = useRef(false);

  // Web Audio API synthesized sound feedback (zero-dependency, always works on any device)
  const playAudioFeedback = useCallback((type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'success') {
        // High double-tone chime (880Hz -> 1320Hz)
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.14);
        gain2.gain.setValueAtTime(0.2, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.14);
        osc2.stop(now + 0.32);
      } else {
        // Low double buzz tone (200Hz)
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn("Could not play synthesized audio:", e);
    }
  }, []);

  const fetchRecentVerifications = useCallback(async () => {
    try {
      const [verificationsRes, bookingsData, eventsData] = await Promise.all([
        fetch(`${API_BASE_URL}/tickets-verifications`),
        adminGetBookingSummaries().catch(() => []),
        adminGetAllEvents().catch(() => [])
      ]);

      if (!verificationsRes.ok) return;
      const rawLogs: any[] = await verificationsRes.json();
      if (!Array.isArray(rawLogs)) return;

      const bookingMap = new Map((bookingsData || []).map((b: any) => [String(b.id), b]));
      const eventMap = new Map((eventsData || []).map((e: any) => [String(e.id), e.name]));

      const sorted = rawLogs.sort((a, b) => new Date(b.checking_time).getTime() - new Date(a.checking_time).getTime());
      const top5 = sorted.slice(0, 5);

      const formatted: RecentVerificationItem[] = top5.map(log => {
        const booking = bookingMap.get(String(log.booking_id));
        const eventName = eventMap.get(String(log.event_id)) || `Event #${log.event_id}`;
        const attendeeName = booking?.userName || 'Attendee';
        const isComp = (booking?.payment_method || '').toLowerCase() === 'complimentary';

        return {
          id: String(log.id),
          bookingId: String(log.booking_id),
          attendeeName,
          eventName,
          ticketCount: parseInt(log.ticket_count, 10) || 1,
          time: format(new Date(log.checking_time), "HH:mm:ss"),
          isComplimentary: isComp,
        };
      });

      setRecentCheckIns(formatted);
    } catch (err) {
      console.warn("Could not fetch recent verifications:", err);
    }
  }, []);

  // Check secure context and fetch camera list on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!window.isSecureContext && !isLocal) {
        setIsInsecureOrigin(true);
      }
    }

    // Load latest 5 check-ins from database
    fetchRecentVerifications();

    Html5Qrcode.getCameras()
      .then(cameras => {
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          // Prefer back camera if available
          const backCam = cameras.find(c => /back|rear|environment/i.test(c.label));
          setSelectedCameraId(backCam ? backCam.id : cameras[0].id);
        }
      })
      .catch(err => {
        console.warn("Could not enumerate cameras on load:", err);
      });

    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
            html5QrCodeRef.current?.clear();
          });
        } else {
          html5QrCodeRef.current.clear();
        }
      }
    };
  }, [fetchRecentVerifications]);

  const resetVerification = () => {
    setScannedBooking(null);
    setCheckInQuantities({});
    setVerificationError(null);
    setManualCode('');
    setIsLoading(false);
    setIsCommitting(false);
    isProcessingScanRef.current = false;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Automatically scroll down to ticket details when a ticket is scanned
  useEffect(() => {
    if (scannedBooking && resultRef.current) {
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [scannedBooking]);

  const fetchBookingDetails = async (code: string, isSilentRefresh = false) => {
    setIsLoading(true);
    setScannedBooking(null);
    setVerificationError(null);

    try {
      let result: Booking | undefined;
      const cleanCode = code.trim();

      if (/^\d+$/.test(cleanCode)) {
        result = await getBookingById(cleanCode);
      } else {
        result = await getBookingByQrCode(cleanCode);
      }

      if (result) {
        const pStatus = (result.payment_status || 'pending').toLowerCase();
        const isComp = (result.payment_method || '').toLowerCase() === 'complimentary';
        const isAllowed = isComp || pStatus === 'paid';
        const isPartial = pStatus === 'partially paid' || pStatus === 'partially_paid';

        if (!isSilentRefresh) {
          if (isAllowed) {
            playAudioFeedback('success');
          } else {
            playAudioFeedback('error');
            toast({
              variant: 'destructive',
              title: isPartial ? 'Check-in Blocked: Partially Paid' : 'Check-in Blocked: Unpaid',
              description: `Booking #${result.id} is ${result.payment_status} (Balance Due: LKR ${(result.balance_amount || 0).toLocaleString()}). Only fully paid tickets can be checked in.`,
            });
          }
        }
        setScannedBooking(result);

        // Pre-fill quantities: only if payment is complete/complimentary, else 0
        const initialQuantities: Record<string, number> = {};
        let anyAvailable = false;
        result.bookedTickets.forEach(t => {
          const bookedCount = t.quantity;
          const checkedIn = t.checkedInCount || 0;
          const available = Math.max(0, bookedCount - checkedIn);
          // Only pre-fill quantity if check-in is allowed
          initialQuantities[t.id] = (isAllowed && available > 0) ? 1 : 0;
          if (available > 0) anyAvailable = true;
        });
        setCheckInQuantities(initialQuantities);

        // If it was already fully checked in before scanning, notify gently
        if (isAllowed && !anyAvailable && !isSilentRefresh) {
          toast({
            title: 'All Tickets Already Checked In',
            description: `All tickets for Booking #${result.id} were already checked in previously.`,
          });
        }
      } else {
        const errorMessage = 'Ticket not found or QR code is invalid.';
        playAudioFeedback('error');
        setVerificationError(errorMessage);
        toast({ variant: 'destructive', title: 'Verification Failed', description: errorMessage });
      }
    } catch (error) {
      const errorMessage = 'An error occurred while communicating with the server.';
      playAudioFeedback('error');
      console.error('Verification API error:', error);
      setVerificationError(errorMessage);
      toast({ variant: 'destructive', title: 'Verification Failed', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async (cameraIdToUse?: string) => {
    setScannerError(null);
    setIsScannerStarting(true);

    try {
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const origin = window.location.origin;
        const msg = `Mobile browsers block live video streams on HTTP (${origin}). Please tap "Take Photo with Camera" below or configure chrome://flags.`;
        setScannerError(msg);
        setIsScanning(false);
        setIsScannerStarting(false);
        toast({
          variant: 'destructive',
          title: 'HTTPS Required on Mobile',
          description: 'Mobile Chrome & Safari restrict live camera streaming to HTTPS or localhost.',
        });
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const activeCameraId = cameraIdToUse || selectedCameraId;
      const cameraConfig = activeCameraId ? { deviceId: { exact: activeCameraId } } : { facingMode: "environment" };

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
            return { width: Math.round(edge), height: Math.round(edge) };
          },
          aspectRatio: undefined,
        },
        async (decodedText) => {
          if (isProcessingScanRef.current) return;
          isProcessingScanRef.current = true;
          console.log("[QR Scanner] Decoded:", decodedText);
          try {
            await stopScanner();
            await fetchBookingDetails(decodedText);
          } finally {
            isProcessingScanRef.current = false;
          }
        },
        () => {
          // Frame-level scan miss (ignore to prevent log flooding)
        }
      );

      setIsScanning(true);

      // Check torch support
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setIsTorchSupported(true);
        } else {
          setIsTorchSupported(false);
        }
      } catch {
        setIsTorchSupported(false);
      }
    } catch (err: any) {
      console.error("Camera start failed:", err);
      const msg = err?.message || 'Could not start camera. Please ensure camera permissions are granted.';
      setScannerError(msg);
      setIsScanning(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Error',
        description: msg,
      });
    } finally {
      setIsScannerStarting(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
    }
    setIsScanning(false);
    setIsTorchOn(false);
  };

  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (isScanning) {
      await stopScanner();
      await startScanner(newCameraId);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const nextState = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as any
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn("Torch failed:", e);
      toast({ title: "Torch Not Supported", description: "This camera device does not support flashlight control." });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }
      const qrCodeValue = await html5QrCodeRef.current.scanFile(file, true);
      if (qrCodeValue) {
        await fetchBookingDetails(qrCodeValue);
      }
    } catch (err) {
      playAudioFeedback('error');
      toast({
        variant: 'destructive',
        title: 'QR Code Not Found',
        description: 'Unable to detect a valid QR code in the uploaded image.'
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      fetchBookingDetails(manualCode.trim());
    }
  };

  const executeCheckIn = async (quantitiesToCommit: Record<string, number>) => {
    if (!scannedBooking) return;

    const paymentStatus = (scannedBooking.payment_status || 'pending').toLowerCase();
    const isComp = (scannedBooking.payment_method || '').toLowerCase() === 'complimentary';
    const isPaid = isComp || paymentStatus === 'paid';
    const isPartial = paymentStatus === 'partially paid' || paymentStatus === 'partially_paid';

    if (!isPaid) {
      playAudioFeedback('error');
      toast({
        variant: 'destructive',
        title: isPartial ? 'Check-in Blocked: Partially Paid' : 'Check-in Blocked: Unpaid',
        description: `Cannot admit attendee. Booking #${scannedBooking.id} is ${scannedBooking.payment_status} (Balance Due: LKR ${(scannedBooking.balance_amount || 0).toLocaleString()}). Only fully paid bookings can enter.`
      });
      return;
    }

    const checkerName = (user?.name && user.name.trim()) || user?.email || "Admin Verifier";
    const checkInPayloads = [];
    for (const ticket of scannedBooking.bookedTickets) {
      const quantityToCheckIn = quantitiesToCommit[ticket.id] || 0;
      if (quantityToCheckIn > 0) {
        checkInPayloads.push({
          booking_id: parseInt(scannedBooking.id, 10),
          event_id: parseInt(scannedBooking.eventId, 10),
          showtime_id: parseInt(ticket.showTimeId, 10),
          tickettype_id: parseInt(ticket.ticketTypeId, 10),
          ticket_count: quantityToCheckIn,
          checking_time: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          checking_by: checkerName
        });
      }
    }
    
    if (checkInPayloads.length === 0) {
      toast({ title: "No Tickets Selected", description: "Please select at least one ticket to check in." });
      return;
    }

    setIsCommitting(true);
    try {
      const checkinPromises = checkInPayloads.map(payload =>
        fetch(`${API_BASE_URL}/tickets-verifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(async response => {
          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: 'Check-in failed.' }));
            const ticket = scannedBooking.bookedTickets.find(t => t.ticketTypeId === String(payload.tickettype_id));
            throw new Error(`Failed for ${ticket?.ticketTypeName || 'ticket'}: ${errorBody.message || errorBody.error}`);
          }
          return response.json();
        })
      );

      await Promise.all(checkinPromises);
      
      const totalCheckedIn = checkInPayloads.reduce((sum, p) => sum + p.ticket_count, 0);
      playAudioFeedback('success');
      toast({ 
        title: "Check-in Successful!", 
        description: `Successfully checked in ${totalCheckedIn} ticket(s).`
      });

      // Update recent check-ins log (latest 5)
      const recentItem: RecentVerificationItem = {
        id: `${Date.now()}-${scannedBooking.id}`,
        bookingId: scannedBooking.id,
        attendeeName: scannedBooking.userName || 'Guest',
        eventName: scannedBooking.eventName || 'Event',
        ticketCount: totalCheckedIn,
        time: format(new Date(), "HH:mm:ss"),
        isComplimentary: isComp,
      };
      setRecentCheckIns(prev => [recentItem, ...prev.filter(i => i.id !== recentItem.id).slice(0, 4)]);
      fetchRecentVerifications();
      
      // Refresh details silently without triggering duplicate error toast
      await fetchBookingDetails(scannedBooking.qrCodeValue || scannedBooking.id, true);
      
    } catch (error) {
      playAudioFeedback('error');
      toast({ 
        variant: 'destructive', 
        title: 'Check-in Failed', 
        description: error instanceof Error ? error.message : "An unknown error occurred." 
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    await executeCheckIn(checkInQuantities);
  };

  const handleSelectAllAvailable = () => {
    if (!scannedBooking) return;
    const paymentStatus = (scannedBooking.payment_status || 'pending').toLowerCase();
    const isComp = (scannedBooking.payment_method || '').toLowerCase() === 'complimentary';
    const isPaid = isComp || paymentStatus === 'paid';
    if (!isPaid) {
      toast({
        variant: 'destructive',
        title: 'Check-in Prohibited',
        description: `This booking is not fully paid (${scannedBooking.payment_status}). Cannot select tickets for check-in.`
      });
      return;
    }

    const newQuantities: Record<string, number> = {};
    scannedBooking.bookedTickets.forEach(t => {
      const available = Math.max(0, t.quantity - (t.checkedInCount || 0));
      newQuantities[t.id] = available;
    });
    setCheckInQuantities(newQuantities);
  };

  const handleQuantityChange = (ticket: BookedTicket, change: number) => {
    if (!scannedBooking) return;
    const paymentStatus = (scannedBooking.payment_status || 'pending').toLowerCase();
    const isComp = (scannedBooking.payment_method || '').toLowerCase() === 'complimentary';
    const isPaid = isComp || paymentStatus === 'paid';
    if (!isPaid) return;

    const currentQtyToCommit = checkInQuantities[ticket.id] || 0;
    const newQtyToCommit = currentQtyToCommit + change;

    const bookedCount = ticket.quantity;
    const checkedInCount = ticket.checkedInCount || 0;
    const availableToCheckIn = bookedCount - checkedInCount;
    
    if (newQtyToCommit > availableToCheckIn) {
      toast({
        title: "Limit Reached",
        description: `Only ${availableToCheckIn} tickets are available to check in.`,
        variant: "destructive",
      });
      return;
    }

    if (newQtyToCommit >= 0) {
      setCheckInQuantities(prev => ({ ...prev, [ticket.id]: newQtyToCommit }));
    }
  };

  const renderBookingDetails = () => {
    if (!scannedBooking) return null;
    const totalTicketsToCheckIn = Object.values(checkInQuantities).reduce((sum, q) => sum + q, 0);
    const paymentStatus = (scannedBooking.payment_status || 'pending').toLowerCase();
    const isComp = (scannedBooking.payment_method || '').toLowerCase() === 'complimentary';
    const isPaid = isComp || paymentStatus === 'paid';
    const isPartial = paymentStatus === 'partially paid' || paymentStatus === 'partially_paid';

    const totalBooked = scannedBooking.bookedTickets.reduce((sum, t) => sum + t.quantity, 0);
    const totalCheckedIn = scannedBooking.bookedTickets.reduce((sum, t) => sum + (t.checkedInCount || 0), 0);
    const totalRemaining = Math.max(0, totalBooked - totalCheckedIn);

    return (
      <div className="w-full space-y-4">
        <Card className={cn(
          "border-2 animate-in fade-in-50",
          isComp 
            ? "border-purple-500 shadow-purple-100 dark:shadow-none" 
            : (!isPaid 
                ? "border-red-500 shadow-red-100 dark:shadow-none bg-red-50/10" 
                : "border-emerald-500 shadow-emerald-100 dark:shadow-none")
        )}>
          <CardHeader className={cn(
            "text-center py-4",
            isComp 
              ? "bg-purple-100/70 dark:bg-purple-950/40" 
              : (!isPaid 
                  ? "bg-red-100/80 dark:bg-red-950/50" 
                  : "bg-emerald-100/70 dark:bg-emerald-950/40")
          )}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {isComp ? (
                <Gift className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              ) : !isPaid ? (
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400 animate-pulse" />
              ) : (
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <CardTitle className={cn(
              "text-2xl font-bold flex items-center justify-center gap-2",
              isComp 
                ? "text-purple-900 dark:text-purple-200" 
                : (!isPaid 
                    ? "text-red-900 dark:text-red-200" 
                    : "text-emerald-900 dark:text-emerald-200")
            )}>
              {isComp 
                ? "Complimentary Pass Found" 
                : (!isPaid 
                    ? (isPartial ? "Partially Paid — Check-in Blocked" : "Unpaid Booking — Check-in Blocked") 
                    : "Valid Paid Ticket Found")}
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Booking ID: <span className="font-mono font-bold text-foreground">#{scannedBooking.id}</span> • Attendee: <span className="font-semibold text-foreground">{scannedBooking.userName}</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4">
            {/* Complimentary Highlight Banner */}
            {isComp && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div>
                    <p className="font-bold text-purple-900 dark:text-purple-200 text-sm">
                      Official Complimentary Pass (Free Guest Ticket)
                    </p>
                    <p className="text-xs text-purple-700/80 dark:text-purple-300/80">
                      Authorized free pass. No payment or balance is required.
                    </p>
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white font-semibold text-xs px-2 py-0.5 shadow-sm">
                  Free Pass
                </Badge>
              </div>
            )}

            {/* Blocked Alert Banner for Unpaid / Partially Paid */}
            {!isPaid && (
              <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/60 shadow-sm text-left">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="ml-2">
                  <AlertTitle className="text-red-900 dark:text-red-100 font-bold text-base">
                    {isPartial ? "Entry Prohibited: Partially Paid Booking" : "Entry Prohibited: Payment Not Confirmed"}
                  </AlertTitle>
                  <AlertDescription className="text-red-800 dark:text-red-200 text-sm mt-1.5 leading-relaxed">
                    {isPartial ? (
                      <>
                        This booking has only been partially paid and has an outstanding balance of{' '}
                        <span className="font-mono font-bold text-sm text-red-950 dark:text-white bg-red-200/80 dark:bg-red-900/80 px-2 py-0.5 rounded border border-red-300 dark:border-red-700">
                          LKR {(scannedBooking.balance_amount || 0).toLocaleString()}
                        </span>
                        . Attendees <strong>cannot be checked in</strong> until the remaining balance is fully settled.
                      </>
                    ) : (
                      <>
                        This booking status is <strong className="capitalize">{paymentStatus}</strong>. Attendees cannot be admitted without full payment confirmation.
                      </>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="text-center space-y-1 py-1 bg-muted/40 rounded-lg p-2.5">
              <p className="font-bold text-base text-foreground">{scannedBooking.eventName}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(scannedBooking.eventDate).toLocaleString()}
              </p>
              <div className="flex justify-center items-center gap-2 pt-1">
                {!isComp && (
                  <Badge 
                    variant="secondary"
                    className={cn('capitalize text-xs font-semibold px-2.5 py-0.5', {
                      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300': paymentStatus === 'paid',
                      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300': isPartial,
                      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300': paymentStatus === 'failed' || paymentStatus === 'pending',
                    })}
                  >
                    Payment: {scannedBooking.payment_status || 'Pending'}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                  {totalCheckedIn} / {totalBooked} Admitted
                </Badge>
              </div>
            </div>
            
            {/* Ticket Breakdown and Check-in Selector */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">
                  {isPaid ? "Select Tickets to Check In" : "Ticket Breakdown (Check-in Locked)"}
                </h3>
                {isPaid && totalRemaining > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAllAvailable} 
                    className="h-7 text-xs text-primary hover:text-primary font-medium"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Select All Remaining
                  </Button>
                )}
              </div>

              {scannedBooking.bookedTickets.map(ticket => {
                const bookedCount = ticket.quantity;
                const checkedInCount = ticket.checkedInCount || 0;
                const availableToCheckIn = bookedCount - checkedInCount;
                const isSelected = (checkInQuantities[ticket.id] || 0) > 0;

                return (
                  <div 
                    key={ticket.id} 
                    className={cn(
                      "p-3 border rounded-lg transition-colors",
                      !isPaid ? "opacity-75 bg-red-50/20 border-red-200 dark:border-red-900/30" : (isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-card"),
                      availableToCheckIn === 0 && "opacity-75 bg-muted/30"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">{ticket.ticketTypeName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {availableToCheckIn} of {bookedCount} available to check-in
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleQuantityChange(ticket, -1)} 
                          disabled={!isPaid || checkInQuantities[ticket.id] === 0 || isCommitting}
                        >
                          <MinusCircle className="h-4 w-4"/>
                        </Button>
                        <span className="font-bold text-base w-7 text-center font-mono">
                          {checkInQuantities[ticket.id] || 0}
                        </span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleQuantityChange(ticket, 1)} 
                          disabled={!isPaid || availableToCheckIn === 0 || checkInQuantities[ticket.id] >= availableToCheckIn || isCommitting}
                        >
                          <PlusCircle className="h-4 w-4"/>
                        </Button>
                      </div>
                    </div>

                    {!isPaid ? (
                      <p className="text-[11px] text-center font-semibold text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-950/40 py-1 rounded">
                        🚫 Entry prohibited: {isPartial ? 'Partially paid booking' : 'Unpaid booking'} — settlement required
                      </p>
                    ) : availableToCheckIn === 0 ? (
                      <p className="text-[11px] text-center font-semibold text-green-600 dark:text-green-400 mt-2 bg-green-50 dark:bg-green-950/40 py-1 rounded">
                        ✓ All tickets for this tier are already checked in
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button 
            size="lg" 
            className={cn(
              "flex-1 py-6 text-base font-semibold shadow-sm transition-all",
              !isPaid 
                ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed hover:bg-slate-200" 
                : (isComp ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white")
            )}
            onClick={handleConfirmCheckIn} 
            disabled={!isPaid || isCommitting || totalTicketsToCheckIn === 0}
          >
            {!isPaid ? (
              <>
                <XCircle className="mr-2 h-5 w-5 text-red-500 shrink-0" />
                <span>Check-in Blocked ({isPartial ? 'Partially Paid' : 'Unpaid'})</span>
              </>
            ) : isCommitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5"/>
                <span>Confirm Check-in ({totalTicketsToCheckIn})</span>
              </>
            )}
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="flex-1 py-6 text-base font-medium" 
            onClick={resetVerification} 
            disabled={isCommitting}
          >
            <RotateCcw className="mr-2 h-5 w-5" /> Next Verification
          </Button>
        </div>
      </div>
    );
  };

  const renderResultArea = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 h-full text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 font-medium text-foreground">Verifying Ticket with Server...</p>
          <p className="text-xs text-muted-foreground mt-1">Checking booking status and remaining counts</p>
        </div>
      );
    }
    if (scannedBooking) {
      return renderBookingDetails();
    }
    if (verificationError) {
      return (
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600">
            <XCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Verification Failed</h3>
            <p className="text-sm text-muted-foreground mt-1">{verificationError}</p>
          </div>
          <Button onClick={resetVerification} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center py-16 text-muted-foreground h-full flex flex-col justify-center items-center">
        <div className="w-20 h-20 rounded-2xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center mb-4">
          <QrCode className="h-10 w-10 text-muted-foreground/60" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Ready to Verify</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          Aim camera at attendee's QR code, or type their Booking ID manually.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Inline styles to make html5-qrcode look modern and authentic */}
      <style jsx global>{`
        #qr-reader-container {
          border: none !important;
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        #qr-reader-container video {
          border-radius: 1rem !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #qr-reader-container__scan_region {
          border: none !important;
          box-shadow: none !important;
        }
        #qr-reader-container__scan_region > svg,
        #qr-reader-container__scan_region > div {
          border: none !important;
        }
        #qr-reader-container__dashboard {
          display: none !important;
        }
        #qr-reader-container img {
          display: none !important;
        }
        @keyframes laserSweep {
          0% {
            top: 6%;
            opacity: 0.6;
          }
          50% {
            top: 92%;
            opacity: 1;
          }
          100% {
            top: 6%;
            opacity: 0.6;
          }
        }
        .animate-laser {
          animation: laserSweep 2s ease-in-out infinite;
        }
      `}</style>

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <QrCode className="mr-3 h-8 w-8" /> Ticket Verifier
          </h1>
          <p className="text-muted-foreground text-sm">Scan attendee QR codes or enter booking IDs to validate entry tickets.</p>
        </div>
        {user && (
          <div className="flex items-center gap-2 bg-muted/60 border rounded-full px-3.5 py-1.5 text-xs text-muted-foreground w-fit shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Logged in as: <strong className="text-foreground">{user.name || user.email}</strong></span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scanner & Input Methods */}
        <div className="lg:col-span-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Verification Method</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="scan" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="scan"><ScanLine className="mr-2 h-4 w-4"/>Live Camera QR</TabsTrigger>
                  <TabsTrigger value="manual" onClick={() => setTimeout(() => manualInputRef.current?.focus(), 150)}>
                    <Keyboard className="mr-2 h-4 w-4"/>Manual Code
                  </TabsTrigger>
                </TabsList>

                {/* Scan Tab */}
                <TabsContent value="scan" className="pt-4 space-y-4">
                  {/* Insecure Origin (HTTP on Phone) Helper Banner */}
                  {isInsecureOrigin && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Phone Camera Security Rule (HTTP vs HTTPS)</span>
                      </div>
                      <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                        Mobile browsers (Chrome / Safari) strictly block live video streams over non-secure local IP (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-bold">{typeof window !== 'undefined' ? window.location.host : '192.168.x.x:9002'}</code>).
                      </p>
                      <div>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={() => cameraCaptureRef.current?.click()}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2.5 shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Camera className="h-4 w-4" /> Tap to Snap Photo with Camera (Works on HTTP)
                        </Button>
                      </div>
                      <details className="text-[11px] text-amber-900/80 dark:text-amber-200/80 pt-1 cursor-pointer">
                        <summary className="font-semibold hover:underline">How to unlock live video scanning on this phone (30s):</summary>
                        <ol className="list-decimal pl-4 space-y-1 mt-1 font-sans">
                          <li>In phone Chrome, type: <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1 rounded">chrome://flags</code></li>
                          <li>Search for: <b>Insecure origins treated as secure</b></li>
                          <li>Select <b>Enabled</b> and enter: <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://192.168.8.115:9002'}</code></li>
                          <li>Tap <b>Relaunch</b> at the bottom.</li>
                        </ol>
                      </details>
                    </div>
                  )}

                  {/* Camera Controls & Device Picker */}
                  {availableCameras.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select value={selectedCameraId} onValueChange={handleCameraChange}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Camera" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCameras.map(cam => (
                            <SelectItem key={cam.id} value={cam.id} className="text-xs">
                              {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Camera Stream Area - Large Authentic Scanner UI */}
                  <div className="w-full overflow-hidden rounded-2xl bg-slate-950 relative h-[440px] sm:h-[490px] md:h-[530px] flex items-center justify-center border-2 border-slate-800 shadow-2xl">
                    <div id="qr-reader-container" className="w-full h-full" />
                    
                    {/* Floating HUD Controls Overlay when camera is active */}
                    {isScanning && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4 sm:p-5 z-20">
                        {/* Top Bar inside Camera */}
                        <div className="flex items-center justify-between w-full pointer-events-auto">
                          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-xs font-mono shadow-md">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="tracking-wider">SCANNER ACTIVE</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isTorchSupported && (
                              <button
                                type="button"
                                onClick={toggleTorch}
                                className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-md",
                                  isTorchOn ? "bg-amber-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
                                )}
                                title={isTorchOn ? "Flashlight Off" : "Flashlight On"}
                              >
                                <Zap className="h-4 w-4" />
                              </button>
                            )}

                            {availableCameras.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentIdx = availableCameras.findIndex(c => c.id === selectedCameraId);
                                  const nextIdx = (currentIdx + 1) % availableCameras.length;
                                  handleCameraChange(availableCameras[nextIdx].id);
                                }}
                                className="h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-md"
                                title="Switch Camera"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Center QR Scanner Viewfinder Reticle */}
                        <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-auto">
                          {/* Corner Reticles */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

                          {/* Glowing Animated Laser Sweep */}
                          <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-laser" />
                        </div>

                        {/* Bottom Instruction Pill */}
                        <div className="bg-black/75 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/90 text-xs font-medium tracking-wide shadow-lg">
                          Align attendee QR code inside the frame
                        </div>
                      </div>
                    )}
                    
                    {!isScanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-muted-foreground p-6 text-center z-10">
                        <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 text-slate-400 shadow-inner">
                          <ScanLine className="h-10 w-10 text-primary animate-pulse" />
                        </div>
                        <p className="font-bold text-foreground text-base">QR Scanner Ready</p>
                        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                          Click "Start Scanning" to activate the camera viewfinder, or use the camera photo snap button.
                        </p>
                      </div>
                    )}
                  </div>

                  {scannerError && (
                    <Alert variant="destructive" className="py-2.5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-xs font-semibold">Camera Error</AlertTitle>
                      <AlertDescription className="text-xs">{scannerError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Camera Action Buttons */}
                  <div className="flex gap-2">
                    {isScanning ? (
                      <Button 
                        size="lg" 
                        variant="destructive" 
                        onClick={stopScanner} 
                        className="flex-1 py-5 text-sm font-semibold"
                      >
                        <VideoOff className="mr-2 h-4 w-4" /> Stop Scanning
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        onClick={() => startScanner()} 
                        disabled={isScannerStarting || isLoading} 
                        className="flex-1 py-5 text-sm font-semibold"
                      >
                        {isScannerStarting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Video className="mr-2 h-4 w-4" />
                        )}
                        Start Scanning
                      </Button>
                    )}

                    {isScanning && isTorchSupported && (
                      <Button 
                        size="lg" 
                        variant={isTorchOn ? "default" : "outline"} 
                        onClick={toggleTorch}
                        className={cn("px-4 py-5", isTorchOn && "bg-amber-500 hover:bg-amber-600 text-white")}
                        title={isTorchOn ? "Turn Torch Off" : "Turn Torch On"}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Camera Snap Input (Works on mobile even over HTTP) */}
                    <input 
                      type="file" 
                      ref={cameraCaptureRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                    />
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => cameraCaptureRef.current?.click()}
                      className="px-3.5 py-5 text-xs text-muted-foreground hover:text-foreground"
                      title="Take Photo with Camera"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>

                    {/* Upload QR Image file input */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-5 text-xs text-muted-foreground hover:text-foreground"
                      title="Upload QR Code from Gallery"
                    >
                      <UploadCloud className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Manual Code Tab */}
                <TabsContent value="manual" className="pt-4">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-code" className="text-xs font-semibold">
                        Booking ID, QR Code String, or Barcode Gun Entry
                      </Label>
                      <Input 
                        id="manual-code" 
                        ref={manualInputRef}
                        placeholder="e.g. 373 or scan with barcode gun..." 
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                        className="h-11 font-mono text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Tip: You can use USB/Bluetooth barcode guns here. Pressing Enter automatically checks the code.
                      </p>
                    </div>
                    <Button type="submit" className="w-full py-5 font-semibold" disabled={isLoading || !manualCode.trim()}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                      Verify Code
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Recent Verifications Feed */}
          {recentCheckIns.length > 0 && (
            <Card>
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Recent Check-ins (Latest 5)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y text-xs">
                {recentCheckIns.map(item => (
                  <div key={item.id} className="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">#{item.bookingId}</span>
                        <span className="font-medium text-foreground">{item.attendeeName}</span>
                        {item.isComplimentary && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 text-[10px] py-0 px-1 font-semibold flex items-center gap-0.5">
                            <Gift className="h-2.5 w-2.5" /> Free Pass
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.eventName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-300 font-semibold">
                        +{item.ticketCount} Checked In
                      </Badge>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Verification Result */}
        <div className="lg:col-span-6 scroll-mt-6" ref={resultRef}>
          <Card className="min-h-[460px] shadow-sm">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base font-semibold">Verification Result</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {renderResultArea()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketVerificationPage;
