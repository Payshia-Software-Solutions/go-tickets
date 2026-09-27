"use client";

import { getBookingById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, Ticket, MapPin, CalendarDays, AlertTriangle, 
  CreditCard, Clock, User, Loader2, Info, AlertCircle, ShieldCheck,
  Lock, Mail 
} from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import PayNowButton from '@/components/PayNowButton';
import DownloadTicketActions from '@/components/events/DownloadTicketButton';
import QRCode from '@/components/QRCode';
import { useEffect, useState, use } from 'react';
import type { Booking } from '@/lib/types';
import * as fpixel from '@/lib/fpixel';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

interface BookingConfirmationPageProps {
  searchParams: Promise<{ order_id?: string | string[]; token?: string | string[] }>;
}

export default function BookingConfirmationPage({ searchParams }: BookingConfirmationPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state for guest / unauthenticated access without valid token
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Safely extract bookingId and token even if repeated in URL query parameters (e.g. from PayHere redirect)
  const rawOrderId = resolvedSearchParams.order_id;
  const bookingId = Array.isArray(rawOrderId)
    ? rawOrderId[0]
    : (typeof rawOrderId === 'string' ? rawOrderId.split(',')[0].trim() : undefined);

  const rawToken = resolvedSearchParams.token;
  const urlToken = Array.isArray(rawToken)
    ? rawToken[0]
    : (typeof rawToken === 'string' ? rawToken.split(',')[0].trim() : undefined);

  useEffect(() => {
    if (bookingId && typeof window !== 'undefined') {
      if (sessionStorage.getItem(`verified_booking_${bookingId}`) === 'true') {
        setIsEmailVerified(true);
      }
    }
  }, [bookingId]);

  useEffect(() => {
    if (booking && urlToken && typeof window !== 'undefined' && bookingId) {
      const isValid = (booking.token && urlToken === booking.token) || (booking.qrCodeValue && urlToken === booking.qrCodeValue);
      if (isValid) {
        sessionStorage.setItem(`verified_booking_${bookingId}`, 'true');
      }
    }
  }, [booking, urlToken, bookingId]);

  useEffect(() => {
    document.title = isLoading ? 'Loading Booking...' : (booking ? `Booking ${booking.id} | GoTickets.lk` : 'Booking Not Found');
  }, [isLoading, booking]);

  useEffect(() => {
    if (!bookingId) {
      setError("No booking ID was provided in the URL. Please check the link and try again.");
      setIsLoading(false);
      return;
    }

    const fetchBooking = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const bookingData = await getBookingById(bookingId);
        if (bookingData) {
          setBooking(bookingData);
          const status = (bookingData.payment_status || 'pending').toLowerCase();
          const isPaid = status === 'paid' || status === 'partially paid';
          if (isPaid) {
            // Track Purchase event
            fpixel.track('Purchase', {
              value: bookingData.totalPrice,
              currency: 'LKR',
              content_ids: bookingData.bookedTickets.map(t => t.ticketTypeId),
              content_type: 'product',
              num_items: bookingData.bookedTickets.reduce((sum, t) => sum + t.quantity, 0)
            });
          }
        } else {
          setBooking(null);
          setError(`The booking with ID "${bookingId}" could not be found or has expired.`);
        }
      } catch (e) {
        console.error("Failed to fetch booking:", e);
        setError("An error occurred while fetching your booking details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 text-center flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading booking details...</p>
      </div>
    );
  }
  
  if (error || !booking) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Booking Not Found</AlertTitle>
          <AlertDescription>
            {error || `The booking with ID "${bookingId}" could not be found or has expired.`}
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Access Authorization Check
  const bookingEmail = (booking.email || booking.billingAddress?.email || '').trim().toLowerCase();
  const isAdmin = user?.isAdmin === true;
  const isOwner = Boolean(user && String(user.id) === String(booking.userId) && !booking.guest);
  const isEmailMatchedUser = Boolean(user?.email && user.email.trim().toLowerCase() === bookingEmail);
  const isTokenValid = Boolean(
    urlToken && (
      (booking.token && urlToken === booking.token) ||
      (booking.qrCodeValue && urlToken === booking.qrCodeValue)
    )
  );

  const hasAccess = isAdmin || isOwner || isEmailMatchedUser || isTokenValid || isEmailVerified;

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationEmail.trim()) {
      setVerificationError("Please enter your email address.");
      return;
    }
    const inputEmail = verificationEmail.trim().toLowerCase();
    if (bookingEmail && inputEmail === bookingEmail) {
      setIsEmailVerified(true);
      if (typeof window !== 'undefined' && bookingId) {
        sessionStorage.setItem(`verified_booking_${bookingId}`, 'true');
      }
      setVerificationError(null);
    } else {
      setVerificationError("The email address provided does not match our records for this booking. Please check the email used during checkout.");
    }
  };

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-md mx-auto shadow-xl border-border">
          <CardHeader className="text-center p-6 bg-muted/30 rounded-t-lg">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Verification Required</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              For your privacy and ticket security, please confirm your email address to access Booking #{bookingId}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {verificationError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{verificationError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="verify-email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="verify-email"
                    type="email"
                    placeholder="Enter the email used for booking"
                    value={verificationEmail}
                    onChange={(e) => {
                      setVerificationEmail(e.target.value);
                      if (verificationError) setVerificationError(null);
                    }}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Verify & View Booking
              </Button>
            </form>

            <div className="relative my-4">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-2 text-center text-sm">
              <p className="text-muted-foreground text-xs">
                Already have an account?{' '}
                <Link href={`/login?redirect=/booking-confirmation?order_id=${bookingId}`} className="text-primary font-medium hover:underline">
                  Log In
                </Link>
              </p>
              <div>
                <Link href="/" className="text-xs text-muted-foreground hover:underline">
                  Return to Home
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rawStatus = (booking.payment_status || 'pending').toLowerCase();
  const rawTotalPrice = booking.totalPrice || 0;
  const amountPaid = booking.amount_paid !== undefined 
    ? booking.amount_paid 
    : (rawStatus === 'paid' ? rawTotalPrice : 0);
  const balanceDue = booking.balance_amount !== undefined 
    ? booking.balance_amount 
    : Math.max(0, rawTotalPrice - amountPaid);

  // Confirmed if:
  // 1. Paid
  // 2. Partially paid
  // 3. Manual booking with payment record (>0) or verified slip
  const isConfirmed = 
    rawStatus === 'paid' || 
    rawStatus === 'partially paid' || 
    (booking.booked_type === 'manualy' && (amountPaid > 0 || !!booking.payment_slip));

  const isPartiallyPaid = balanceDue > 0 && amountPaid > 0;
  const isFullyPaid = balanceDue <= 0 && amountPaid > 0;

  const eventDate = new Date(booking.eventDate);
  const formattedEventDate = eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedEventTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const bookingDate = new Date(booking.bookingDate);
  const formattedBookingDate = bookingDate.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!isConfirmed) {
    // RENDER PENDING PAYMENT VIEW
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="bg-amber-500 text-primary-foreground text-center p-8 rounded-t-lg">
            <Clock className="mx-auto h-16 w-16 mb-4" />
            <CardTitle className="text-3xl font-bold">Booking Pending Payment</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg">
              Please complete your payment to confirm your tickets for {booking.eventName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Booking Reference ID:</p>
              <p className="text-2xl font-mono font-bold text-accent">{booking.id}</p>
            </div>
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertTitle>Payment Required</AlertTitle>
              <AlertDescription>
                Your booking is reserved but not yet confirmed. You must complete the payment to receive your verified entry pass and QR code.
              </AlertDescription>
            </Alert>
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <h3 className="text-lg font-semibold text-foreground mb-1">Order Summary</h3>
              <p className="text-sm font-medium text-muted-foreground -mt-1 mb-3">{booking.eventName}</p>
              {booking.bookedTickets.map((ticket, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b last:border-b-0 py-2">
                  <span>{ticket.quantity} x {ticket.ticketTypeName}</span>
                </div>
              ))}
              <div className="flex justify-between items-center font-bold text-lg border-t pt-3 mt-3">
                <span>Total Due:</span>
                <span className="font-mono">LKR {booking.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <PayNowButton bookingId={booking.id} />
            <Separator className="my-6" />
            <div className="text-center mt-6">
              <Link href="/" className="text-primary hover:underline text-sm font-medium">
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER CONFIRMED / VERIFIED OFFICIAL RECEIPT & TICKET VIEW
  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader className="bg-primary text-primary-foreground text-center p-8 rounded-t-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="h-10 w-10 text-emerald-400" />
          </div>
          <CardTitle className="text-3xl font-bold">
            {isPartiallyPaid ? 'Booking & Advance Confirmed!' : 'Booking Confirmed!'}
          </CardTitle>
          <CardDescription className="text-primary-foreground/90 text-base">
            {isPartiallyPaid 
              ? `Your reservation for ${booking.eventName} is verified. Remaining balance can be settled at entry.`
              : `Thank you for your booking. Your entry pass for ${booking.eventName} is verified.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center p-3.5 rounded-lg border bg-muted/20 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Booking ID</p>
              <p className="text-xl font-mono font-bold text-primary">{booking.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                className="capitalize text-xs font-semibold"
              >
                {booking.booked_type === 'manualy' ? 'Direct / Manual Booking' : 'Online Booking'}
              </Badge>
              <Badge 
                className={isFullyPaid ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}
              >
                {isFullyPaid ? 'Fully Paid' : 'Partially Paid'}
              </Badge>
            </div>
          </div>

          {/* Partial payment notice banner */}
          {isPartiallyPaid && (
            <Alert className="border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="font-semibold">Installment Payment Notice</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                Advance of <strong>LKR {amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> is received. 
                Remaining balance of <strong>LKR {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> will be collected at check-in or before the event.
              </AlertDescription>
            </Alert>
          )}

          {/* Event Details */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
              <Ticket className="mr-2 h-5 w-5 text-primary" /> Event Details
            </h3>
            <p className="font-bold text-lg">{booking.eventName}</p>
            <div className="text-sm text-muted-foreground space-y-1.5">
              <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-accent" /> {formattedEventDate} at {formattedEventTime}</p>
              <p className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-accent" /> {booking.eventLocation}</p>
              <p className="flex items-center"><User className="mr-2 h-4 w-4 text-accent" /> Attendee: <strong>{booking.userName || 'Guest'}</strong></p>
            </div>
          </div>

          {/* Ticket Summary & Financial Ledger */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <h3 className="text-base font-semibold text-foreground mb-1">Your Tickets</h3>
            {booking.bookedTickets.map((ticket, index) => (
              <div key={index} className="flex justify-between items-center text-sm border-b last:border-b-0 py-2">
                <span>{ticket.quantity} x {ticket.ticketTypeName}</span>
              </div>
            ))}
            
            {/* Financial breakdown */}
            <div className="space-y-1.5 border-t pt-3 mt-3 font-mono text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Ticket Value:</span>
                <span className="font-semibold text-foreground">LKR {booking.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Amount Paid:</span>
                <span className="font-bold">LKR {amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 border-t pt-1 font-semibold">
                  <span>Balance Due at Venue:</span>
                  <span>LKR {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-right pt-1">Issued on: {formattedBookingDate}</p>
          </div>
          
          {/* QR Code Section */}
          <div className="text-center space-y-3 pt-2">
            <p className="font-semibold text-sm">Present this verified QR code at the entrance scanner:</p>
            <div className="inline-block p-3 bg-white rounded-xl shadow-sm border">
              <QRCode data={booking.qrCodeValue} size={180} className="mx-auto" />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{booking.qrCodeValue}</p>
          </div>

          {/* Download Ticket Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <DownloadTicketActions booking={booking} formattedDate={formattedEventDate} formattedTime={formattedEventTime} />
          </div>

          <Separator className="my-6" />

          <div className="text-center pt-2">
            <Link href="/account_dashboard" className="text-primary hover:underline text-sm font-medium">
              View all your bookings
            </Link>
            <span className="mx-2 text-muted-foreground">|</span>
            <Link href="/" className="text-primary hover:underline text-sm font-medium">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
