
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Video, VideoOff, CheckCircle, XCircle, QrCode, MinusCircle, PlusCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Booking, BookedTicket } from '@/lib/types';

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
  const [isLoading, setIsLoading] = useState(false); // For initial scan
  const [isCommitting, setIsCommitting] = useState(false); // For check-in commit
  const { toast } = useToast();
  const audioSuccessRef = useRef<HTMLAudioElement>();
  const audioErrorRef = useRef<HTMLAudioElement>();

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
      setHasCameraPermission(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
    }
  }, [toast]);

  useEffect(() => {
    getCameraPermission();
  }, [getCameraPermission]);

  const resetScanner = () => {
    setScannedBooking(null);
    setCheckInQuantities({});
    setIsScanning(true); // Go back to scanning mode
  };

  const fetchBookingDetails = async (qrCodeValue: string) => {
    setIsLoading(true);
    setScannedBooking(null);
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
        // Initialize check-in quantities to 0 for all ticket types
        const initialQuantities: Record<string, number> = {};
        result.booking.bookedTickets.forEach(t => {
          initialQuantities[t.ticketTypeId] = 0;
        });
        setCheckInQuantities(initialQuantities);
      } else {
        audioErrorRef.current?.play().catch(e => console.warn("Could not play sound:", e));
        toast({ variant: 'destructive', title: 'Verification Failed', description: result.message || 'Ticket not found or invalid.' });
        // Keep scanning after a brief pause if ticket not found
        setTimeout(() => setIsScanning(true), 2000);
      }
    } catch (error) {
      audioErrorRef.current?.play().catch(e => console.warn("Could not play sound:", e));
      console.error('Verification API error:', error);
      toast({ variant: 'destructive', title: 'Verification Failed', description: 'An error occurred while communicating with the server.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject || isLoading || scannedBooking) {
      return;
    }

    // @ts-ignore - BarcodeDetector is not in all TS libs yet
    const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    
    try {
      const barcodes = await barcodeDetector.detect(videoRef.current);
      if (barcodes.length > 0) {
        setIsScanning(false); // Stop scanning once a code is found
        await fetchBookingDetails(barcodes[0].rawValue);
      }
    } catch (error) {
      // Ignore detection errors, they happen
    }
  }, [isLoading, scannedBooking, fetchBookingDetails]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isScanning && hasCameraPermission) {
      intervalId = setInterval(scanFrame, 200);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isScanning, hasCameraPermission, scanFrame]);

  const handleStartScan = () => {
    setScannedBooking(null);
    setCheckInQuantities({});
    setIsScanning(true);
  };

  const handleQuantityChange = (ticket: BookedTicket, change: number) => {
    const currentCheckIn = checkInQuantities[ticket.ticketTypeId] || 0;
    const newCheckIn = currentCheckIn + change;
    const alreadyCheckedIn = ticket.checkedInCount || 0;
    
    if (newCheckIn >= 0 && (newCheckIn + alreadyCheckedIn <= ticket.quantity)) {
      setCheckInQuantities(prev => ({...prev, [ticket.ticketTypeId]: newCheckIn }));
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
        // Refresh booking details to show updated counts
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
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verifying QR Code...</p>
        </div>
      );
    }

    if (!scannedBooking) return null;

    const totalTicketsToCheckIn = Object.values(checkInQuantities).reduce((sum, q) => sum + q, 0);

    return (
      <div className="w-full max-w-lg">
        <Card className="border-primary border-2">
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
                       <p className="text-sm text-muted-foreground">
                         {alreadyCheckedIn} / {ticket.quantity} checked in
                       </p>
                       <div className="flex items-center space-x-2">
                         <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(ticket, -1)} disabled={checkInQuantities[ticket.ticketTypeId] === 0 || isCommitting}>
                           <MinusCircle className="h-5 w-5"/>
                         </Button>
                         <span className="font-bold text-lg w-8 text-center">{checkInQuantities[ticket.ticketTypeId] || 0}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(ticket, 1)} disabled={availableToCheckIn === 0 || checkInQuantities[ticket.ticketTypeId] >= availableToCheckIn || isCommitting}>
                           <PlusCircle className="h-5 w-5"/>
                         </Button>
                       </div>
                    </div>
                     {availableToCheckIn === 0 && <p className="text-xs text-center font-bold text-green-600 mt-2">All tickets of this type have been checked in.</p>}
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
            <Button size="lg" variant="outline" className="flex-1 py-6 text-lg" onClick={resetScanner} disabled={isCommitting}>
              <RotateCcw className="mr-2 h-5 w-5" /> Scan Another Ticket
            </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline flex items-center">
            <QrCode className="mr-3 h-8 w-8" /> Ticket Verifier
        </h1>
        <p className="text-muted-foreground">Scan a ticket's QR code to validate and check-in attendees.</p>
      </header>

      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-6">
          
          {scannedBooking ? renderBookingDetails() : (
            <>
              <div className="w-full max-w-md relative">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-2/3 h-2/3 border-4 border-dashed border-primary/50 rounded-lg animate-pulse"></div>
                    </div>
                )}
              </div>

              {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Camera Not Available</AlertTitle>
                  <AlertDescription>
                    Could not access camera. Please ensure permissions are allowed.
                    <Button variant="link" onClick={getCameraPermission} className="p-0 h-auto ml-1">Try Again</Button>
                  </AlertDescription>
                </Alert>
              )}

              {!isScanning && (
                <Button size="lg" onClick={handleStartScan} disabled={hasCameraPermission !== true || isLoading}>
                  <Video className="mr-2 h-4 w-4" /> Start Scanning
                </Button>
              )}
              {isScanning && (
                 <Button size="lg" variant="destructive" onClick={() => setIsScanning(false)}>
                  <VideoOff className="mr-2 h-4 w-4" /> Stop Scanning
                </Button>
              )}
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default TicketVerificationPage;
