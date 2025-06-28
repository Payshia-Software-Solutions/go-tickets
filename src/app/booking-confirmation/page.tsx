
import { getBookingById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Ticket, MapPin, CalendarDays, AlertTriangle, CreditCard, Clock, User } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import PayNowButton from '@/components/PayNowButton';
import DownloadTicketButton from '@/components/events/DownloadTicketButton';
import QRCode from '@/components/QRCode';

interface BookingConfirmationPageProps {
  searchParams: { order_id?: string };
}

export async function generateMetadata(
  { searchParams }: BookingConfirmationPageProps
): Promise<Metadata> {
  const bookingId = searchParams.order_id;

  if (!bookingId) {
    return {
      title: 'Booking Not Found',
      robots: {
        index: false,
      },
    };
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    return {
      title: 'Booking Not Found',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const isPaid = (booking.payment_status || 'pending').toLowerCase() === 'paid';

  return {
    title: isPaid ? `Booking Confirmed: ${booking.eventName}` : `Payment Pending: ${booking.eventName}`,
    description: `Your booking for ${booking.eventName}. ID: ${booking.id}. Status: ${isPaid ? 'Confirmed' : 'Pending'}.`,
    robots: {
      index: false, // Do not index booking confirmation pages
      follow: true,
    },
    openGraph: {
      title: isPaid ? `Booking Confirmed: ${booking.eventName}` : `Payment Pending: ${booking.eventName}`,
      description: `Your tickets for ${booking.eventName} are ${isPaid ? 'confirmed' : 'pending payment'}.`,
    },
  };
}

export default async function BookingConfirmationPage({ searchParams }: BookingConfirmationPageProps) {
  const bookingId = searchParams.order_id;

   if (!bookingId) {
    return (
        <div className="container mx-auto py-12 text-center">
            <Alert variant="destructive" className="max-w-md mx-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    No booking ID was provided in the URL. Please check the link and try again.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    return (
        <div className="container mx-auto py-12 text-center">
            <Alert variant="destructive" className="max-w-md mx-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Booking Not Found</AlertTitle>
                <AlertDescription>
                    The booking with ID "{bookingId}" could not be found or has expired.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  const isPaid = (booking.payment_status || 'pending').toLowerCase() === 'paid';

  const eventDate = new Date(booking.eventDate);
  const formattedEventDate = eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedEventTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const bookingDate = new Date(booking.bookingDate);
  const formattedBookingDate = bookingDate.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!isPaid) {
    // RENDER PENDING PAYMENT VIEW
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="bg-amber-500 text-primary-foreground text-center p-8 rounded-t-lg">
            <Clock className="mx-auto h-16 w-16 mb-4" />
            <CardTitle className="text-3xl font-bold">Booking Not Confirmed</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg">
              Please complete your payment to confirm your tickets for {booking.eventName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">Booking ID:</p>
              <p className="text-xl font-mono font-semibold text-accent">{booking.id}</p>
            </div>
            <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertTitle>Payment Required</AlertTitle>
                <AlertDescription>
                  Your booking is reserved but not yet confirmed. You must complete the payment to receive your tickets and QR code for entry.
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
                <span>LKR {booking.totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <PayNowButton bookingId={booking.id} />
             <Separator className="my-6" />
             <div className="text-center mt-6">
                <Link href="/" className="text-primary hover:underline">
                    Back to Home
                </Link>
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER PAID/CONFIRMED VIEW
  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader className="bg-primary text-primary-foreground text-center p-8 rounded-t-lg">
          <CheckCircle className="mx-auto h-16 w-16 mb-4" />
          <CardTitle className="text-3xl font-bold">Booking Confirmed!</CardTitle>
          <CardDescription className="text-primary-foreground/80 text-lg">
            Thank you for your purchase. Your tickets for {booking.eventName} are confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">Booking ID:</p>
            <p className="text-xl font-mono font-semibold text-accent">{booking.id}</p>
          </div>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center">
              <Ticket className="mr-2 h-6 w-6 text-primary" /> Event Details
            </h3>
            <p className="font-bold text-lg">{booking.eventName}</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4" /> {formattedEventDate} at {formattedEventTime}</p>
              <p className="flex items-center"><MapPin className="mr-2 h-4 w-4" /> {booking.eventLocation}</p>
              <p className="flex items-center"><User className="mr-2 h-4 w-4" /> Attendee: {booking.userName || 'Guest'}</p>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <h3 className="text-lg font-semibold text-foreground mb-1">Your Tickets</h3>
            <p className="text-sm font-medium text-muted-foreground -mt-1 mb-3">{booking.eventName}</p>
            {booking.bookedTickets.map((ticket, index) => (
              <div key={index} className="flex justify-between items-center text-sm border-b last:border-b-0 py-2">
                <span>{ticket.quantity} x {ticket.ticketTypeName}</span>
              </div>
            ))}
            <div className="flex justify-between items-center font-bold text-lg border-t pt-3 mt-3">
              <span>Total Paid:</span>
              <span>LKR {booking.totalPrice.toFixed(2)}</span>
            </div>
             <p className="text-xs text-muted-foreground text-right pt-1">Booked on: {formattedBookingDate}</p>
          </div>
          
          <div className="text-center space-y-4">
            <p className="font-semibold">Scan this QR code for entry:</p>
            <QRCode data={booking.qrCodeValue} size={200} className="mx-auto" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <DownloadTicketButton booking={booking} />
          </div>

          <Separator className="my-6" />

          <div className="text-center mt-6 pt-6 border-t">
            <Link href="/account_dashboard" className="text-primary hover:underline">
              View all your bookings
            </Link>
             <span className="mx-2 text-muted-foreground">|</span>
             <Link href="/" className="text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
