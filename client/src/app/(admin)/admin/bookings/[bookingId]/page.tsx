"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking, BookingPayment } from '@/lib/types';
import { getBookingById } from '@/lib/mockData';
import { 
  getBookingPayments, 
  addBookingPayment, 
  updateBookingDetails, 
  uploadPaymentSlip 
} from '@/lib/services/booking.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, AlertTriangle, ArrowLeft, Phone, MessageSquare, 
  Mail, ExternalLink, CreditCard, PlusCircle, Edit3, 
  FileText, CheckCircle2, DollarSign, Clock, AlertCircle, 
  Download, Eye, X, UploadCloud, MinusCircle, Gift
} from 'lucide-react';
import QRCode from '@/components/QRCode';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE_URL, CONTENT_PROVIDER_URL } from '@/lib/constants';
import Image from 'next/image';

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);

  // Add Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const isSlipRequired = paymentMethod === 'Bank Transfer' || paymentMethod === 'Direct Cash Deposit';
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const paymentSlipInputRef = useRef<HTMLInputElement>(null);

  // Edit Booking Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNic, setEditNic] = useState('');
  const [editedTickets, setEditedTickets] = useState<Array<{ id: string; ticketTypeName: string; quantity: number; pricePerTicket: number }>>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchBookingAndPayments = useCallback(async () => {
    if (!bookingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [bookingData, paymentsData] = await Promise.all([
        getBookingById(bookingId),
        getBookingPayments(bookingId).catch(() => [])
      ]);

      if (bookingData) {
        setBooking(bookingData);
        setPayments(paymentsData);
        document.title = `Booking ${bookingData.id} | Event Horizon Admin`;

        // Pre-fill edit fields
        setEditFirstName(bookingData.billingAddress?.firstName || '');
        setEditLastName(bookingData.billingAddress?.lastName || '');
        setEditEmail(bookingData.billingAddress?.email || '');
        setEditPhone(bookingData.billingAddress?.phone_number || '');
        setEditNic(bookingData.billingAddress?.nic || '');
        setEditedTickets(bookingData.bookedTickets.map(t => ({
          id: t.id,
          ticketTypeName: t.ticketTypeName,
          quantity: t.quantity,
          pricePerTicket: t.pricePerTicket || 0
        })));
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
  }, [bookingId]);

  useEffect(() => {
    fetchBookingAndPayments();
  }, [fetchBookingAndPayments]);

  const handleOpenAddPayment = () => {
    if (!booking) return;
    const remaining = booking.balance_amount !== undefined ? booking.balance_amount : Math.max(0, booking.totalPrice - (booking.amount_paid || 0));
    setPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setPaymentMethod('Bank Transfer');
    setPaymentRef('');
    setPaymentNotes('');
    setSlipFile(null);
    setSlipPreview(null);
    setIsAddPaymentOpen(true);
  };

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setSlipFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSlipPreview(null);
    }
  };

  const handleAddPaymentSubmit = async () => {
    if (!booking) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" });
      return;
    }

    const isSlipRequired = paymentMethod === 'Bank Transfer' || paymentMethod === 'Direct Cash Deposit';
    if (isSlipRequired && !slipFile) {
      toast({ 
        title: "Bank Slip Required", 
        description: `Please attach the bank slip for ${paymentMethod} verification. (Or change payment method to 'Cash in Hand' if cash was received).`, 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      let uploadedSlipUrl: string | undefined = undefined;
      if (slipFile) {
        toast({ title: "Uploading Slip...", description: "Please wait while your bank slip is uploaded." });
        const uploadRes = await uploadPaymentSlip(slipFile);
        uploadedSlipUrl = uploadRes.filePath;
      }

      await addBookingPayment(booking.id, {
        amount: amountNum,
        payment_method: paymentMethod,
        payment_slip: uploadedSlipUrl,
        reference: paymentRef || undefined,
        notes: paymentNotes || undefined
      });

      toast({ 
        title: "Payment Recorded!", 
        description: `LKR ${amountNum.toLocaleString()} recorded successfully.` 
      });

      setIsAddPaymentOpen(false);
      await fetchBookingAndPayments();
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Error Recording Payment", 
        description: err instanceof Error ? err.message : "Failed to record payment.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleEditBookingSubmit = async () => {
    if (!booking) return;

    setIsSubmittingEdit(true);
    try {
      await updateBookingDetails(booking.id, {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        contact_number: editPhone,
        nic: editNic,
        tickets: editedTickets.map(t => ({
          id: t.id,
          ticket_count: t.quantity,
          price: t.pricePerTicket
        }))
      });

      toast({ title: "Booking Updated", description: "Booking details and ticket counts updated successfully." });
      setIsEditBookingOpen(false);
      await fetchBookingAndPayments();
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Error Updating Booking", 
        description: err instanceof Error ? err.message : "Failed to update booking.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const getFullSlipUrl = (slipPath: string | null | undefined): string | null => {
    if (!slipPath) return null;
    if (slipPath.startsWith('http://') || slipPath.startsWith('https://')) {
      return slipPath;
    }
    if (slipPath.startsWith('/payment-slips') || slipPath.startsWith('payment-slips')) {
      const cleanPath = slipPath.startsWith('/') ? slipPath : `/${slipPath}`;
      return `${CONTENT_PROVIDER_URL}${cleanPath}`;
    }
    const cleanBase = API_BASE_URL.replace(/\/$/, "");
    const cleanPath = slipPath.replace(/^\//, "");
    return `${cleanBase}/${cleanPath}`;
  };

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
  const isComplimentary = booking.payment_method?.toLowerCase() === 'complimentary';
  const amountPaid = isComplimentary ? 0 : (booking.amount_paid !== undefined ? booking.amount_paid : (paymentStatus === 'paid' ? booking.totalPrice : 0));
  const balanceDue = isComplimentary ? 0 : (booking.balance_amount !== undefined ? booking.balance_amount : Math.max(0, booking.totalPrice - amountPaid));
  const isFullyPaid = isComplimentary || (balanceDue <= 0 && (amountPaid > 0 || booking.totalPrice === 0));
  const isPartiallyPaid = !isComplimentary && amountPaid > 0 && balanceDue > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <div>
          <Button onClick={() => router.push('/admin/bookings')} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
          </Button>
          <div className="flex items-center gap-3 mt-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">
              Booking #{booking.id}
            </h1>
            <Badge 
              variant="outline"
              className={cn('text-xs font-semibold capitalize tracking-wider', {
                'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300': booking.booked_type === 'manualy',
                'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300': booking.booked_type !== 'manualy',
              })}
            >
              {booking.booked_type === 'manualy' ? 'Manual Booking' : 'Online Booking'}
            </Badge>
            <Badge 
              className={cn('capitalize text-xs font-semibold px-2.5 py-0.5', {
                'bg-purple-600 text-white hover:bg-purple-600': isComplimentary,
                'bg-green-600 text-white hover:bg-green-600': !isComplimentary && isFullyPaid,
                'bg-amber-500 text-white hover:bg-amber-500': !isComplimentary && isPartiallyPaid,
                'bg-red-500 text-white hover:bg-red-500': !isComplimentary && !isFullyPaid && !isPartiallyPaid,
              })}
            >
              {isComplimentary ? 'Complimentary Pass' : (isFullyPaid ? 'Fully Paid' : (isPartiallyPaid ? 'Partially Paid' : 'Pending'))}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created on {new Date(booking.bookingDate).toLocaleString()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isComplimentary && balanceDue > 0 && (
            <Button onClick={handleOpenAddPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <PlusCircle className="mr-2 h-4 w-4" /> Record Installment
            </Button>
          )}

          {booking.booked_type === 'manualy' && (
            <Button onClick={() => setIsEditBookingOpen(true)} variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Booking
            </Button>
          )}

          <Button asChild variant="outline">
            <Link href={`/booking-confirmation?order_id=${booking.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Official Receipt / E-Ticket
            </Link>
          </Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Financial Overview Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-primary"/> Financial & Payment Status
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Method: <span className="font-semibold text-foreground">{booking.payment_method || 'N/A'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border bg-card">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {isComplimentary ? 'Standard Ticket Value' : 'Total Amount'}
                  </p>
                  <p className={cn("text-xl font-bold font-mono", isComplimentary ? "text-muted-foreground line-through" : "")}>
                    LKR {booking.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  {isComplimentary && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      <Gift className="h-3 w-3" /> 100% Free Waiver
                    </p>
                  )}
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 pt-2 sm:pt-0">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                    {isComplimentary ? 'Amount Charged' : 'Amount Paid'}
                  </p>
                  <p className="text-xl font-bold font-mono text-green-600 dark:text-green-400">
                    LKR {isComplimentary ? '0.00' : amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isComplimentary ? '100% Complimentary Pass' : (booking.totalPrice > 0 ? `${Math.round((amountPaid / booking.totalPrice) * 100)}% Settled` : '0%')}
                  </p>
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 pt-2 sm:pt-0">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Balance Due</p>
                  <p className={cn("text-xl font-bold font-mono", (!isComplimentary && balanceDue > 0) ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                    LKR {(isComplimentary ? 0 : balanceDue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  {isComplimentary ? (
                    <span className="inline-flex items-center text-xs text-purple-600 dark:text-purple-400 font-medium">
                      <CheckCircle2 className="h-3 w-3 mr-1"/> 100% Free / Settled
                    </span>
                  ) : balanceDue > 0 ? (
                    <span className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <AlertCircle className="h-3 w-3 mr-1"/> Action Needed
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3 w-3 mr-1"/> Fully Cleared
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Slip and Notes banner */}
              {(booking.payment_slip || booking.payment_notes) && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-lg border bg-muted/30 gap-3">
                  <div className="space-y-1">
                    {booking.payment_notes && (
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Payment Notes:</strong> {booking.payment_notes}
                      </p>
                    )}
                    {booking.payment_slip && (
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Main Deposit Slip:</strong> {booking.payment_slip.split('/').pop()}
                      </p>
                    )}
                  </div>
                  {booking.payment_slip && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="shrink-0"
                      onClick={() => setSlipModalUrl(getFullSlipUrl(booking.payment_slip))}
                    >
                      <Eye className="h-4 w-4 mr-1.5"/> View Main Slip
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Installments & Payment History Ledger */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Payment History & Installment Ledger</CardTitle>
                  <CardDescription>All offline deposits, bank transfers, and partial payments</CardDescription>
                </div>
                {balanceDue > 0 && (
                  <Button size="sm" variant="outline" onClick={handleOpenAddPayment}>
                    <PlusCircle className="h-4 w-4 mr-1"/> Add Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/10">
                  <p>No separate installment records logged in the ledger yet.</p>
                  {amountPaid > 0 && (
                    <p className="text-xs mt-1">
                      Initial amount paid recorded at booking: <strong>LKR {amountPaid.toLocaleString()}</strong> ({booking.payment_method || 'Direct'})
                    </p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Slip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">
                          {p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {p.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.reference || p.notes || '-'}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-green-600 dark:text-green-400">
                          LKR {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.payment_slip ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 text-primary"
                              onClick={() => setSlipModalUrl(getFullSlipUrl(p.payment_slip))}
                            >
                              <FileText className="h-4 w-4 mr-1"/> View
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Event & Booked Tickets */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Event & Ticket Details</CardTitle>
                {booking.booked_type === 'manualy' && (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditBookingOpen(true)} className="text-primary">
                    <Edit3 className="h-4 w-4 mr-1"/> Adjust Counts
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-muted/20 p-3 rounded-lg">
                <p><strong>Event:</strong> {booking.eventName}</p>
                <p><strong>Showtime:</strong> {new Date(booking.eventDate).toLocaleString()}</p>
                <p><strong>Venue / Location:</strong> {booking.eventLocation}</p>
                <p><strong>Total Tickets:</strong> {booking.bookedTickets.reduce((sum, t) => sum + t.quantity, 0)} Seats</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket Category</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Checked-In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.bookedTickets.map((ticket, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{ticket.ticketTypeName}</TableCell>
                      <TableCell className="text-center font-bold font-mono">{ticket.quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {ticket.checkedInCount || 0} / {ticket.quantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attendee Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Attendee Details</CardTitle>
                {booking.booked_type === 'manualy' && (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditBookingOpen(true)} className="h-7 px-2">
                    <Edit3 className="h-3.5 w-3.5"/>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-4 break-words">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer Name</p>
                <p className="font-semibold text-base">{booking.userName || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">NIC / ID</p>
                  <p className="font-mono">{booking.billingAddress?.nic || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">User ID</p>
                  <p className="font-mono text-xs">{booking.userId}</p>
                </div>
              </div>
              
              <Separator />

              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Direct Contact</h4>
                <div className="space-y-1 mb-3 text-xs">
                  <p><strong>Email:</strong> {booking.billingAddress?.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {rawPhoneNumber || 'N/A'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {rawPhoneNumber && (
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <a href={`tel:${rawPhoneNumber}`} className="flex items-center justify-center">
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                      </a>
                    </Button>
                  )}
                  {whatsAppNumber && (
                    <Button asChild variant="outline" size="sm" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 flex-1">
                      <a href={`https://wa.me/${whatsAppNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Address</p>
                <p className="text-xs text-muted-foreground">
                  {[booking.billingAddress?.street, booking.billingAddress?.city, booking.billingAddress?.state, booking.billingAddress?.postalCode, booking.billingAddress?.country].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Entry QR Code */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Entry QR Code</CardTitle>
              <CardDescription className="text-xs">Scan at the venue entry scanner</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2">
              <div className="p-3 bg-white rounded-xl shadow-sm border">
                <QRCode data={booking.qrCodeValue} size={160} />
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-3 text-center">
                {booking.qrCodeValue}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment / Installment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary"/> Record Installment / Payment
            </DialogTitle>
            <DialogDescription>
              Add offline payment record for Booking #{booking.id}. Remaining balance: <strong>LKR {balanceDue.toLocaleString()}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment Amount (LKR) *</Label>
              <Input 
                type="number" 
                min="1"
                max={balanceDue}
                placeholder="Amount in LKR" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              {balanceDue > 0 && (
                <button 
                  type="button" 
                  onClick={() => setPaymentAmount(balanceDue.toString())}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Pay Full Balance (LKR {balanceDue.toLocaleString()})
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Direct Cash Deposit">Direct Cash Deposit (CDM)</SelectItem>
                  <SelectItem value="Cash">Cash in Hand</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Card / POS">Card / POS</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bank Reference / Txn ID</Label>
              <Input 
                placeholder="e.g., TXN-1029384"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>

            {/* Slip Upload */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1">
                  {paymentMethod === 'Cash' ? 'Payment Proof / Receipt' : 'Bank Slip / Payment Proof'}{' '}
                  {isSlipRequired && <span className="text-destructive font-bold">*</span>}
                </span>
                <span className={`text-[11px] ${isSlipRequired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {isSlipRequired ? 'Required for Bank/CDM' : 'Optional for Cash in Hand'}
                </span>
              </Label>
              {slipFile ? (
                <div className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary"/>
                    <span className="text-xs truncate max-w-[200px] font-medium">{slipFile.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSlipFile(null); setSlipPreview(null); }}>
                    <X className="h-4 w-4"/>
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => paymentSlipInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isSlipRequired ? 'border-amber-500/50 bg-amber-50/10 hover:border-amber-500' : 'hover:bg-muted/20'
                  }`}
                >
                  <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground mb-1"/>
                  <p className="text-xs font-medium">
                    {isSlipRequired ? 'Click to upload bank transfer slip (Required)' : 'Click to attach counter receipt or voucher (Optional)'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Supports JPG, PNG, or PDF (Max 10MB)</p>
                  <input 
                    ref={paymentSlipInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleSlipFileChange}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes / Remarks</Label>
              <Textarea 
                placeholder="Additional details regarding this installment..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)} disabled={isSubmittingPayment}>
              Cancel
            </Button>
            <Button onClick={handleAddPaymentSubmit} disabled={isSubmittingPayment || !paymentAmount}>
              {isSubmittingPayment && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking & Ticket Counts Dialog */}
      <Dialog open={isEditBookingOpen} onOpenChange={setIsEditBookingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit3 className="mr-2 h-5 w-5 text-primary"/> Edit Manual Booking #{booking.id}
            </DialogTitle>
            <DialogDescription>
              Update customer details or adjust ticket quantities. Total price and balance will automatically recalculate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {/* Customer Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendee Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">NIC</Label>
                <Input value={editNic} onChange={(e) => setEditNic(e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* Ticket Quantities */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket Quantities</h4>
              {editedTickets.map((t, index) => (
                <div key={t.id || index} className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/20">
                  <div>
                    <p className="font-medium text-sm">{t.ticketTypeName}</p>
                    <p className="text-xs text-muted-foreground">LKR {t.pricePerTicket.toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        setEditedTickets(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item));
                      }}
                      disabled={t.quantity <= 0}
                    >
                      <MinusCircle className="h-4 w-4"/>
                    </Button>
                    <span className="w-8 text-center font-mono font-bold">{t.quantity}</span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        setEditedTickets(prev => prev.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item));
                      }}
                    >
                      <PlusCircle className="h-4 w-4"/>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBookingOpen(false)} disabled={isSubmittingEdit}>
              Cancel
            </Button>
            <Button onClick={handleEditBookingSubmit} disabled={isSubmittingEdit}>
              {isSubmittingEdit && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Slip Lightbox Modal */}
      <Dialog open={!!slipModalUrl} onOpenChange={(open) => { if (!open) setSlipModalUrl(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary"/> Attached Payment Slip
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-2 min-h-[300px]">
            {slipModalUrl?.toLowerCase().endsWith('.pdf') ? (
              <div className="text-center space-y-4 py-8">
                <FileText className="h-16 w-16 mx-auto text-primary"/>
                <p className="text-sm text-muted-foreground">This document is a PDF format.</p>
                <Button asChild>
                  <a href={slipModalUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4"/> Open / Download PDF
                  </a>
                </Button>
              </div>
            ) : (
              slipModalUrl && (
                <div className="relative w-full h-[450px] rounded-lg overflow-hidden border">
                  <Image 
                    src={slipModalUrl} 
                    alt="Payment Slip Preview" 
                    fill 
                    className="object-contain" 
                    unoptimized
                  />
                </div>
              )
            )}
          </div>
          <DialogFooter>
            {slipModalUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={slipModalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4"/> Open in Full Window
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSlipModalUrl(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
