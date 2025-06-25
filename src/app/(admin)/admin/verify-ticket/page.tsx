"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Video, VideoOff, CheckCircle, XCircle, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/lib/types';

interface VerificationResult {
  success: boolean;
  message: string;
  booking?: Booking;
}

const TicketVerificationPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const audioSuccessRef = useRef<HTMLAudioElement>();
  const audioErrorRef = useRef<HTMLAudioElement>();

  useEffect(() => {
    // Preload audio files if they exist
    if (typeof Audio !== "undefined") {
      audioSuccessRef.current = new Audio('/sounds/success.mp3');
      audioErrorRef.current = new Audio('/sounds/error.mp3');
    }
  }, []);

  const getCameraPermission = useCallback(async () => {
    // Check for BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'QR code scanning is not supported by your browser. Please use a modern browser like Chrome or Edge.',
      });
      setHasCameraPermission(false);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  }, [toast]);

  useEffect(() => {
    getCameraPermission();
  }, [getCameraPermission]);

  const verifyTicket = async (bookingId: string) => {
    setIsLoading(true);
    setScanResult(null);
    try {
      const response = await fetch('/api/admin/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      const result: VerificationResult = await response.json();

      if (result.success) {
        audioSuccessRef.current?.play().catch(e => console.warn("Could not play success sound:", e));
      } else {
        audioErrorRef.current?.play().catch(e => console.warn("Could not play error sound:", e));
      }
      setScanResult(result);
      
    } catch (error) {
      audioErrorRef.current?.play().catch(e => console.warn("Could not play error sound:", e));
      console.error('Verification API error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'An error occurred while trying to verify the ticket.',
      });
    } finally {
      setIsLoading(false);
      // Pause scanning for a bit to show result
      setTimeout(() => {
         setIsScanning(false);
         // Don't clear the result automatically, let the user decide to scan again
      }, 5000);
    }
  };
  
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject || isLoading || scanResult) {
      return;
    }

    // @ts-ignore - BarcodeDetector is not in all TS libs yet
    const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    
    try {
      const barcodes = await barcodeDetector.detect(videoRef.current);
      if (barcodes.length > 0) {
        setIsScanning(false); // Stop scanning once a code is found
        const bookingId = barcodes[0].rawValue;
        await verifyTicket(bookingId);
      }
    } catch (error) {
      // This can happen if the frame is not yet ready. We can ignore it.
    }
  }, [isLoading, scanResult, verifyTicket]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isScanning && hasCameraPermission) {
      intervalId = setInterval(scanFrame, 200); // Scan every 200ms
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isScanning, hasCameraPermission, scanFrame]);

  const handleStartScan = () => {
    setScanResult(null);
    setIsScanning(true);
  }

  const renderResultCard = () => {
    if (isLoading) {
      return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle>Verifying Ticket</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Please wait...</p>
            </CardContent>
        </Card>
      );
    }
    
    if (!scanResult) return null;

    const { success, message, booking } = scanResult;

    return (
      <Card className={`w-full max-w-md ${success ? 'border-green-500' : 'border-red-500'} border-2`}>
        <CardHeader className="text-center">
          {success ? 
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" /> : 
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
          }
          <CardTitle className={`text-2xl ${success ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </CardTitle>
          {booking && <CardDescription>Booking ID: {booking.id}</CardDescription>}
        </CardHeader>
        {booking && (
          <CardContent className="space-y-2 text-sm">
            <p><strong>Event:</strong> {booking.eventName}</p>
            <p><strong>Date:</strong> {new Date(booking.eventDate).toLocaleString()}</p>
            <p><strong>Location:</strong> {booking.eventLocation}</p>
            <p><strong>Total Paid:</strong> LKR {booking.totalPrice.toFixed(2)}</p>
            <div className="pt-2">
                <p><strong>Tickets:</strong></p>
                <ul className="list-disc list-inside pl-4">
                    {booking.bookedTickets.map((ticket, idx) => (
                        <li key={idx}>{ticket.quantity} x {ticket.ticketTypeName}</li>
                    ))}
                </ul>
            </div>
            {message === 'Already Scanned' && booking.scannedAt &&
              <p className="font-bold text-amber-600">Scanned At: {new Date(booking.scannedAt).toLocaleString()}</p>
            }
          </CardContent>
        )}
      </Card>
    );
  };
  
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
                Could not access the camera. Please ensure it's connected and permissions are allowed, then try reloading the page.
                <Button variant="link" onClick={getCameraPermission} className="p-0 h-auto ml-1">Try Again</Button>
              </AlertDescription>
            </Alert>
          )}

          {!isScanning && (
            <Button size="lg" onClick={handleStartScan} disabled={hasCameraPermission !== true || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
              {isLoading ? 'Verifying...' : 'Start Scanning'}
            </Button>
          )}
          {isScanning && (
             <Button size="lg" variant="destructive" onClick={() => setIsScanning(false)}>
              <VideoOff className="mr-2 h-4 w-4" /> Stop Scanning
            </Button>
          )}

          {renderResultCard()}
          
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketVerificationPage;
