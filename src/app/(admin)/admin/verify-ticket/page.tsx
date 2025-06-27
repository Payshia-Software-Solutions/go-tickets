
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Video, VideoOff, CheckCircle, XCircle, QrCode, MinusCircle, PlusCircle, RotateCcw, Keyboard, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Booking, BookedTicket } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface VerificationResponse {
  success: boolean;
  message?: string;
  booking?: Booking;
}

const TicketVerificationPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBooking, setScannedBooking] = useState<Booking | null>(null);
  const [checkInQuantities, setCheckInQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const { toast } = useToast();
  const audioSuccessRef = useRef<HTMLAudioElement>();
  const audioErrorRef = useRef<HTMLAudioElement>();

  // New state for manual entry and error display
  const [manualCode, setManualCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Audio !== "undefined") {
      audioSuccessRef.current = new Audio('/sounds/success.mp3');
      audioErrorRef.current = new Audio('/sounds/error.mp3');
    }
  }, []);

  const getCameraPermission = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      toast({ variant: 'destructive', title: 'Browser Not Supported', description: 'QR code scanning is not supported by your browser.' });
      setHasCameraPermission(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
    }
  }, [toast]);

  useEffect(() => {
    getCameraPermission();
  }, [getCameraPermission]);

  const resetVerification = () => {
    setScannedBooking(null);
    setCheckInQuantities({});
    setVerificationError(null);
    setManualCode('');
    setIsLoading(false);
    setIsCommitting(false);
    setIsScanning(false);
  };

  const fetchBookingDetails = async (qrCodeValue: string) => {
    setIsLoading(true);
    setScannedBooking(null);
    setVerificationError(null); // Reset error state on new fetch

    try {
      const response = await fetch('/api/admin/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeValue }),
      });

      const result: VerificationResponse = await response.json();

      if (result.success && result.booking) {
        audioSuccessRef.current?.play().catch(e => console.warn("Could not play sound:", e));
        setScannedBooking(result.booking);
        const initialQuantities: Record<string, number> = {};
        result.booking.bookedTickets.forEach(t => {
          initialQuantities[t.ticketTypeId] = 0;
        });
        setCheckInQuantities(initialQuantities);
      } else {
        const errorMessage = result.message || 'Ticket not found or invalid.';
        audioErrorRef.current?.play().catch(e => console.warn("Could not play sound:", e));
        setVerificationError(errorMessage);
        toast({ variant: 'destructive', title: 'Verification Failed', description: errorMessage });
      }
    } catch (error) {
      const errorMessage = 'An error occurred while communicating with the server.';
      audioErrorRef.current?.play().catch(e => console.warn("Could not play sound:", e));
      console.error('Verification API error:', error);
      setVerificationError(errorMessage);
      toast({ variant: 'destructive', title: 'Verification Failed', description: errorMessage });
    } finally {
      setIsLoading(false);
      setIsScanning(false); // Stop scanning after fetch attempt
    }
  };

  const scanFrame = useCallback(async () => {
    if (!isScanning || !videoRef.current || !videoRef.current.srcObject || isLoading || scannedBooking) {
      return;
    }
    // @ts-ignore - BarcodeDetector is not in all TS libs yet
    const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    try {
      const barcodes = await barcodeDetector.detect(videoRef.current);
      if (barcodes.length > 0) {
        await fetchBookingDetails(barcodes[0].rawValue);
      }
    } catch (error) { /* Ignore detection errors */ }
  }, [isScanning, isLoading, scannedBooking, fetchBookingDetails]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isScanning && hasCameraPermission) {
      intervalId = setInterval(scanFrame, 200);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isScanning, hasCameraPermission, scanFrame]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      fetchBookingDetails(manualCode.trim());
    }
  };
  
  const handleConfirmCheckIn = async () => {
    if (!scannedBooking) return;
    const checkInItems = Object.entries(checkInQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
    
    if (checkInItems.length === 0) {
      toast({ title: "No Tickets Selected", description: "Please select at least one ticket to check in." });
      return;
    }

    setIsCommitting(true);
    try {
      const response = await fetch('/api/admin/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: scannedBooking.id, checkInItems }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Check-in Successful!", description: result.message });
        audioSuccessRef.current?.play().catch(e => console.warn("Could not play sound:", e));
        await fetchBookingDetails(scannedBooking.qrCodeValue);
      } else {
        throw new Error(result.message || "Check-in failed on the server.");
      }
    } catch (error) {
       audioErrorRef.current?.play().catch(e => console.warn("Could not play sound:", e));
       toast({ variant: 'destructive', title: 'Check-in Failed', description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
      setIsCommitting(false);
    }
  };

  const renderBookingDetails = () => {
    if (!scannedBooking) return null;
    const totalTicketsToCheckIn = Object.values(checkInQuantities).reduce((sum, q) => sum + q, 0);

    return (
      <div className="w-full space-y-4">
        <Card className="border-primary border-2 animate-in fade-in-50">
          <CardHeader className="text-center bg-primary/10">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="text-2xl text-primary">Ticket Found</CardTitle>
            <CardDescription>Booking ID: {scannedBooking.id}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <p className="font-bold text-lg">{scannedBooking.eventName}</p>
              <p className="text-sm text-muted-foreground">{new Date(scannedBooking.eventDate).toLocaleString()}</p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-center">Select Tickets to Check In</h3>
              {scannedBooking.bookedTickets.map(ticket => {
                const alreadyCheckedIn = ticket.checkedInCount || 0;
                const availableToCheckIn = ticket.quantity - alreadyCheckedIn;
                return (
                  <div key={ticket.ticketTypeId} className="p-3 border rounded-md bg-muted/30">
                    <p className="font-medium">{ticket.ticketTypeName}</p>
                    <div className="flex justify-between items-center mt-1">
                       <p className="text-sm text-muted-foreground">{alreadyCheckedIn} / {ticket.quantity} checked in</p>
                       <div className="flex items-center space-x-2">
                         <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(ticket, -1)} disabled={checkInQuantities[ticket.ticketTypeId] === 0 || isCommitting}><MinusCircle className="h-5 w-5"/></Button>
                         <span className="font-bold text-lg w-8 text-center">{checkInQuantities[ticket.ticketTypeId] || 0}</span>
                         <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(ticket, 1)} disabled={availableToCheckIn === 0 || checkInQuantities[ticket.ticketTypeId] >= availableToCheckIn || isCommitting}><PlusCircle className="h-5 w-5"/></Button>
                       </div>
                    </div>
                     {availableToCheckIn === 0 && <p className="text-xs text-center font-bold text-green-600 mt-2">All tickets checked in.</p>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
           <Button size="lg" className="flex-1 py-6 text-lg" onClick={handleConfirmCheckIn} disabled={isCommitting || totalTicketsToCheckIn === 0}>
              {isCommitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5"/>}
              Confirm Check-in ({totalTicketsToCheckIn})
            </Button>
            <Button size="lg" variant="outline" className="flex-1 py-6 text-lg" onClick={resetVerification} disabled={isCommitting}>
              <RotateCcw className="mr-2 h-5 w-5" /> Next Verification
            </Button>
        </div>
      </div>
    );
  };
  
  const handleQuantityChange = (ticket: BookedTicket, change: number) => {
    const currentCheckIn = checkInQuantities[ticket.ticketTypeId] || 0;
    const newCheckIn = currentCheckIn + change;
    const alreadyCheckedIn = ticket.checkedInCount || 0;
    
    if (newCheckIn >= 0 && (newCheckIn + alreadyCheckedIn <= ticket.quantity)) {
      setCheckInQuantities(prev => ({...prev, [ticket.ticketTypeId]: newCheckIn }));
    }
  };

  const renderResultArea = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-10 h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying Ticket...</p>
        </div>
      );
    }
    if (scannedBooking) {
      return renderBookingDetails();
    }
    if (verificationError) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>{verificationError}</AlertDescription>
          </Alert>
          <Button onClick={resetVerification} className="w-full mt-4">Try Again</Button>
        </div>
      );
    }
    return (
      <div className="text-center py-10 text-muted-foreground h-full flex flex-col justify-center items-center">
        <QrCode className="mx-auto h-16 w-16 mb-4" />
        <h3 className="text-lg font-medium text-foreground">Ready to Verify</h3>
        <p className="text-sm">Use the scanner or enter a code manually.</p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
          <QrCode className="mr-3 h-8 w-8" /> Ticket Verifier
        </h1>
        <p className="text-muted-foreground">Scan a ticket's QR code or enter it manually to validate and check-in attendees.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader><CardTitle>Verification Method</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan"><ScanLine className="mr-2 h-4 w-4"/>Scan QR</TabsTrigger>
                <TabsTrigger value="manual"><Keyboard className="mr-2 h-4 w-4"/>Manual Entry</TabsTrigger>
              </TabsList>
              <TabsContent value="scan" className="pt-4">
                <div className="w-full relative">
                  <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-2/3 h-2/3 border-4 border-dashed border-primary/50 rounded-lg animate-pulse"></div>
                    </div>
                  )}
                </div>
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Camera Not Available</AlertTitle>
                    <AlertDescription>Could not access camera. <Button variant="link" onClick={getCameraPermission} className="p-0 h-auto ml-1">Try Again</Button></AlertDescription>
                  </Alert>
                )}
                {isScanning ? (
                  <Button size="lg" variant="destructive" onClick={() => setIsScanning(false)} className="w-full mt-4"><VideoOff className="mr-2 h-4 w-4" /> Stop Scanning</Button>
                ) : (
                  <Button size="lg" onClick={() => setIsScanning(true)} disabled={hasCameraPermission !== true || isLoading} className="w-full mt-4"><Video className="mr-2 h-4 w-4" /> Start Scanning</Button>
                )}
              </TabsContent>
              <TabsContent value="manual" className="pt-4">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <Label htmlFor="manual-code">Booking or QR Code</Label>
                  <Input 
                    id="manual-code" 
                    placeholder="Enter code..." 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading || !manualCode}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                    Verify Code
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="min-h-[400px]">
          <CardHeader><CardTitle>Verification Result</CardTitle></CardHeader>
          <CardContent className="h-full">
            {renderResultArea()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketVerificationPage;
