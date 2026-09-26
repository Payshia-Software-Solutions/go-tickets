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
import { getBookingByQrCode, getBookingById } from '@/lib/mockData';
import { API_BASE_URL } from '@/lib/constants';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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

  // Check secure context and fetch camera list on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!window.isSecureContext && !isLocal) {
        setIsInsecureOrigin(true);
      }
    }

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
  }, []);

  const resetVerification = () => {
    setScannedBooking(null);
    setCheckInQuantities({});
    setVerificationError(null);
    setManualCode('');
    setIsLoading(false);
    setIsCommitting(false);
  };

  const fetchBookingDetails = async (code: string) => {
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
        playAudioFeedback('success');
        setScannedBooking(result);

        // Pre-fill quantities: default to 1 ticket if available, or all available
        const initialQuantities: Record<string, number> = {};
        let anyAvailable = false;
        result.bookedTickets.forEach(t => {
          const bookedCount = t.quantity;
          const checkedIn = t.checkedInCount || 0;
          const available = Math.max(0, bookedCount - checkedIn);
          // Pre-select 1 ticket or all if 1
          initialQuantities[t.id] = available > 0 ? 1 : 0;
          if (available > 0) anyAvailable = true;
        });
        setCheckInQuantities(initialQuantities);

        if (!anyAvailable) {
          playAudioFeedback('error');
          toast({
            variant: 'destructive',
            title: 'Already Fully Checked In',
            description: `All tickets for Booking #${result.id} have already been checked in.`,
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
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
            return { width: Math.round(edge), height: Math.round(edge) };
          },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Successfully scanned QR code
          console.log("[QR Scanner] Decoded:", decodedText);
          await fetchBookingDetails(decodedText);
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
          checking_by: "Admin Verifier"
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
            throw new Error(`Failed for ${ticket?.ticketTypeName || 'ticket'}: ${errorBody.message}`);
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

      // Add to recent check-ins log
      const isComp = (scannedBooking.payment_method || '').toLowerCase() === 'complimentary';
      const recentItem: RecentVerificationItem = {
        id: `${Date.now()}-${scannedBooking.id}`,
        bookingId: scannedBooking.id,
        attendeeName: scannedBooking.userName || 'Guest',
        eventName: scannedBooking.eventName || 'Event',
        ticketCount: totalCheckedIn,
        time: format(new Date(), "HH:mm:ss"),
        isComplimentary: isComp,
      };
      setRecentCheckIns(prev => [recentItem, ...prev.slice(0, 7)]);
      
      // Refresh details
      await fetchBookingDetails(scannedBooking.qrCodeValue || scannedBooking.id);
      
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
    const newQuantities: Record<string, number> = {};
    scannedBooking.bookedTickets.forEach(t => {
      const available = Math.max(0, t.quantity - (t.checkedInCount || 0));
      newQuantities[t.id] = available;
    });
    setCheckInQuantities(newQuantities);
  };

  const handleQuickCheckInAll = async () => {
    if (!scannedBooking) return;
    const newQuantities: Record<string, number> = {};
    let totalAvailable = 0;
    scannedBooking.bookedTickets.forEach(t => {
      const available = Math.max(0, t.quantity - (t.checkedInCount || 0));
      newQuantities[t.id] = available;
      totalAvailable += available;
    });

    if (totalAvailable === 0) {
      toast({ title: "Already Checked In", description: "No remaining tickets available for this booking." });
      return;
    }

    setCheckInQuantities(newQuantities);
    await executeCheckIn(newQuantities);
  };

  const handleQuantityChange = (ticket: BookedTicket, change: number) => {
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

    const totalBooked = scannedBooking.bookedTickets.reduce((sum, t) => sum + t.quantity, 0);
    const totalCheckedIn = scannedBooking.bookedTickets.reduce((sum, t) => sum + (t.checkedInCount || 0), 0);
    const totalRemaining = Math.max(0, totalBooked - totalCheckedIn);

    return (
      <div className="w-full space-y-4">
        <Card className={cn(
          "border-2 animate-in fade-in-50",
          isComp ? "border-purple-500 shadow-purple-100 dark:shadow-none" : "border-primary"
        )}>
          <CardHeader className={cn(
            "text-center py-4",
            isComp ? "bg-purple-100/70 dark:bg-purple-950/40" : "bg-primary/10"
          )}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {isComp ? (
                <Gift className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              ) : (
                <CheckCircle className="h-10 w-10 text-primary" />
              )}
            </div>
            <CardTitle className={cn(
              "text-2xl font-bold flex items-center justify-center gap-2",
              isComp ? "text-purple-900 dark:text-purple-200" : "text-primary"
            )}>
              {isComp ? "Complimentary Pass Found" : "Valid Ticket Found"}
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

            {!isPaid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Payment Not Confirmed</AlertTitle>
                <AlertDescription>
                  This booking status is <span className="font-semibold capitalize">{paymentStatus}</span>. Proceed with check-in at your own risk.
                </AlertDescription>
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
                      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300': paymentStatus === 'pending',
                      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300': paymentStatus === 'failed',
                    })}
                  >
                    Payment: {paymentStatus}
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
                <h3 className="font-semibold text-sm">Select Tickets to Check In</h3>
                {totalRemaining > 0 && (
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
                      isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-card",
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
                          disabled={checkInQuantities[ticket.id] === 0 || isCommitting}
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
                          disabled={availableToCheckIn === 0 || checkInQuantities[ticket.id] >= availableToCheckIn || isCommitting}
                        >
                          <PlusCircle className="h-4 w-4"/>
                        </Button>
                      </div>
                    </div>

                    {availableToCheckIn === 0 && (
                      <p className="text-[11px] text-center font-semibold text-green-600 dark:text-green-400 mt-2 bg-green-50 dark:bg-green-950/40 py-1 rounded">
                        ✓ All tickets for this tier are already checked in
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2">
          {totalRemaining > 0 && (
            <Button 
              size="lg" 
              className={cn(
                "w-full py-6 text-base font-semibold shadow-md",
                isComp ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
              )}
              onClick={handleQuickCheckInAll} 
              disabled={isCommitting}
            >
              {isCommitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5"/>
              )}
              1-Click Check-in All Remaining ({totalRemaining})
            </Button>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              size="lg" 
              variant={totalRemaining > 0 ? "outline" : "default"}
              className="flex-1 py-5 text-sm" 
              onClick={handleConfirmCheckIn} 
              disabled={isCommitting || totalTicketsToCheckIn === 0}
            >
              {isCommitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4"/>}
              Confirm Selected ({totalTicketsToCheckIn})
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="flex-1 py-5 text-sm" 
              onClick={resetVerification} 
              disabled={isCommitting}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Next Verification
            </Button>
          </div>
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
      {/* Inline styles to make html5-qrcode look modern */}
      <style jsx global>{`
        #qr-reader-container {
          border: none !important;
          position: relative !important;
          width: 100% !important;
        }
        #qr-reader-container video {
          border-radius: 0.5rem !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #qr-reader-container__scan_region {
          border-radius: 0.5rem !important;
        }
        #qr-reader-container img {
          display: none !important;
        }
      `}</style>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
          <QrCode className="mr-3 h-8 w-8" /> Ticket Verifier
        </h1>
        <p className="text-muted-foreground">Scan attendee QR codes or enter booking IDs to validate entry tickets.</p>
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

                  {/* Camera Stream Area */}
                  <div className="w-full overflow-hidden rounded-lg bg-black relative aspect-[4/3] flex items-center justify-center border border-border shadow-inner">
                    <div id="qr-reader-container" className="w-full h-full" />
                    
                    {!isScanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/95 text-muted-foreground p-6 text-center z-10">
                        <VideoOff className="h-12 w-12 mb-3 text-muted-foreground/50" />
                        <p className="font-semibold text-foreground text-sm">Camera is Stopped</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Click "Start Scanning" to open camera, or tap the Camera button below.
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
                  Recent Check-ins (This Session)
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
        <div className="lg:col-span-6">
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
