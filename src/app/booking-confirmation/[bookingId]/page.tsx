
import { getBookingById } from '@/lib/mockData';
import QRCode from '@/components/QRCode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, CalendarPlus, Ticket, MapPin, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';

interface BookingConfirmationPageProps {
  params: { bookingId: string };
}

export async function generateMetadata(
  { params }: BookingConfirmationPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const booking = await getBookingById(params.bookingId);

  if (!booking) {
    return {
      title: 'Booking Not Found',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: `Booking Confirmed: ${booking.eventName}`,
    description: `Your booking for ${booking.eventName} is confirmed. Booking ID: ${booking.id}.`,
    robots: {
      index: false, // Do not index booking confirmation pages
      follow: true,
    },
    openGraph: {
      title: `Booking Confirmed: ${booking.eventName}`,
      description: `Your tickets for ${booking.eventName} are confirmed.`,
      // You might want a generic event confirmation image here
    },
  };
}

export default async function BookingConfirmationPage({ params: { bookingId } }: BookingConfirmationPageProps) {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    return <div className="container mx-auto py-12 text-center">Booking not found or has expired.</div>;
  }

  const eventDate = new Date(booking.eventDate);
  const formattedEventDate = eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedEventTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const bookingDate = new Date(booking.bookingDate);
  const formattedBookingDate = bookingDate.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

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
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Tickets</h3>
            {booking.tickets.map((ticket, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{ticket.quantity} x {ticket.ticketTypeName}</span>
                <span>LKR {(ticket.quantity * ticket.pricePerTicket).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
              <span>Total Paid:</span>
              <span>LKR {booking.totalPrice.toFixed(2)}</span>
            </div>
             <p className="text-xs text-muted-foreground text-right pt-1">Booked on: {formattedBookingDate}</p>
          </div>
          
          <div className="text-center space-y-4">
            <p className="font-semibold">Scan this QR code for entry:</p>
            <QRCode data={booking.qrCodeValue} size={200} className="mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <Button variant="outline" size="lg" disabled>
              <Download className="mr-2 h-5 w-5" /> Download Ticket (Mock)
            </Button>
            <Button variant="outline" size="lg" disabled>
              <CalendarPlus className="mr-2 h-5 w-5" /> Add to Calendar (Mock)
            </Button>
          </div>

          <div className="text-center mt-6">
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
