
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking } from '@/lib/types';
import { getBookingById } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, ArrowLeft, Phone, MessageSquare } from 'lucide-react';
import QRCode from '@/components/QRCode';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      const fetchBooking = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getBookingById(bookingId);
          if (data) {
            setBooking(data);
            document.title = `Booking ${data.id} | Event Horizon Admin`;
          } else {
            setError('Booking not found.');
            document.title = 'Booking Not Found | Event Horizon Admin';
          }
        } catch (err) {
          setError('Failed to fetch booking details.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchBooking();
    }
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Could not load booking</AlertTitle>
                    <AlertDescription>{error || 'The requested booking could not be found.'}</AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/admin/bookings')} variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Bookings
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  const paymentStatus = (booking.payment_status || 'pending').toLowerCase();
  
  const rawPhoneNumber = booking.billingAddress?.phone_number;
  
  const formatWhatsAppNumber = (phone: string | undefined | null): string | null => {
      if (!phone) return null;
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        return '94' + cleaned.substring(1);
      }
      if (cleaned.startsWith('94') && cleaned.length === 11) {
          return cleaned;
      }
      return cleaned;
  };

  const whatsAppNumber = formatWhatsAppNumber(rawPhoneNumber);

  return (
    <div className="space-y-6">
        <header className="flex items-center justify-between">
            <div>
                 <Button onClick={() => router.push('/admin/bookings')} variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline mt-4">Booking Details</h1>
                <p className="text-muted-foreground">
                    Booking ID: <span className="font-mono">{booking.id}</span>
                </p>
            </div>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-lg">Event & Payment</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p><strong>Event:</strong> {booking.eventName}</p>
                        <p><strong>Date:</strong> {new Date(booking.eventDate).toLocaleString()}</p>
                        <p><strong>Location:</strong> {booking.eventLocation}</p>
                        <Separator className="my-2" />
                        <p><strong>Total Price:</strong> LKR {booking.totalPrice.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                          <strong>Payment Status:</strong> 
                          <Badge 
                            variant="secondary"
                            className={cn('capitalize', {
                              'bg-green-100 text-green-800 border-green-200': paymentStatus === 'paid',
                              'bg-amber-100 text-amber-800 border-amber-200': paymentStatus === 'pending',
                              'bg-red-100 text-red-800 border-red-200': paymentStatus === 'failed',
                            })}
                          >
                            {paymentStatus}
                          </Badge>
                        </div>
                        <p><strong>Booked On:</strong> {new Date(booking.bookingDate).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-lg">Booked Tickets</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-center">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {booking.bookedTickets.map((ticket, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{ticket.ticketTypeName}</TableCell>
                                        <TableCell className="text-center">{ticket.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                 <Card>
                    <CardHeader><CardTitle className="text-lg">Attendee & Billing Details</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-4 break-words">
                        <p><strong>User ID:</strong> <span className="font-mono text-xs">{booking.userId}</span></p>
                        <p><strong>Name:</strong> {booking.userName || 'N/A'}</p>
                        <p><strong>Email:</strong> {booking.billingAddress?.email || 'N/A'}</p>
                        <p><strong>NIC:</strong> {booking.billingAddress?.nic || 'N/A'}</p>
                        
                        <Separator />

                        <div>
                            <p><strong>Phone:</strong> {rawPhoneNumber || 'N/A'}</p>
                            {rawPhoneNumber && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                                    <a href={`tel:${rawPhoneNumber}`} className="flex items-center justify-center">
                                        <Phone className="mr-2 h-4 w-4" /> Call
                                    </a>
                                    </Button>
                                    {whatsAppNumber && (
                                    <Button asChild variant="outline" size="sm" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 flex-1 sm:flex-none">
                                        <a href={`https://wa.me/${whatsAppNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                                        <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                                        </a>
                                    </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <Separator />
                        
                        <p><strong>Address:</strong> {[booking.billingAddress?.street, booking.billingAddress?.city, booking.billingAddress?.state, booking.billingAddress?.postalCode, booking.billingAddress?.country].filter(Boolean).join(', ') || 'N/A'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-lg">QR Code for Entry</CardTitle></CardHeader>
                    <CardContent className="flex justify-center">
                        <QRCode data={booking.qrCodeValue} size={150} />
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
