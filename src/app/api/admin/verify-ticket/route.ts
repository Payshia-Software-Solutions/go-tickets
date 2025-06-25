
import { NextResponse } from 'next/server';
import { getBookingByQrCode, getBookingById } from '@/lib/mockData';
import type { Booking } from '@/lib/types';

// In-memory store for checked-in tickets for this server session.
// In a real app, this would be a database table (e.g., CheckIns).
// Structure: Map<bookingId, Map<ticketTypeId, checkedInCount>>
const checkedInTickets = new Map<string, Map<string, number>>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Differentiate between fetching booking details and committing a check-in
    if (body.checkInItems) {
      return handleCheckIn(body);
    } else {
      return handleFetchBooking(body);
    }
  } catch (error) {
    console.error('API Error in verify-ticket endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
  }
}

async function handleFetchBooking(body: { qrCodeValue: string }) {
  const { qrCodeValue } = body;

  if (!qrCodeValue || typeof qrCodeValue !== 'string') {
    return NextResponse.json({ success: false, message: 'Invalid QR Code: No Value provided.' }, { status: 400 });
  }

  const booking = await getBookingByQrCode(qrCodeValue);
  
  if (!booking) {
    return NextResponse.json({ success: false, message: 'Ticket Not Found' }, { status: 404 });
  }
  
  // Augment booking with current check-in status
  const bookingCheckIns = checkedInTickets.get(booking.id);
  booking.bookedTickets.forEach(ticket => {
    ticket.checkedInCount = bookingCheckIns?.get(ticket.ticketTypeId) || 0;
  });

  return NextResponse.json({ success: true, booking: booking });
}

async function handleCheckIn(body: { bookingId: string; checkInItems: { ticketTypeId: string; quantity: number }[] }) {
  const { bookingId, checkInItems } = body;

  const booking = await getBookingById(bookingId); // Fetch by ID for security
  if (!booking) {
    return NextResponse.json({ success: false, message: 'Booking not found for check-in.' }, { status: 404 });
  }

  const bookingCheckIns = checkedInTickets.get(bookingId) || new Map<string, number>();

  // Validation Phase: Ensure no check-in exceeds the allowed quantity
  for (const item of checkInItems) {
    if (item.quantity === 0) continue;

    const ticketInBooking = booking.bookedTickets.find(t => t.ticketTypeId === item.ticketTypeId);
    if (!ticketInBooking) {
      return NextResponse.json({ success: false, message: `Invalid ticket type ${item.ticketTypeId} for this booking.` }, { status: 400 });
    }
    const alreadyCheckedIn = bookingCheckIns.get(item.ticketTypeId) || 0;
    if (alreadyCheckedIn + item.quantity > ticketInBooking.quantity) {
      return NextResponse.json({ success: false, message: `Check-in for ${ticketInBooking.ticketTypeName} exceeds quantity.` }, { status: 400 });
    }
  }

  // Commit Phase: Update the check-in counts
  for (const item of checkInItems) {
     if (item.quantity === 0) continue;
    const currentCount = bookingCheckIns.get(item.ticketTypeId) || 0;
    bookingCheckIns.set(item.ticketTypeId, currentCount + item.quantity);
  }

  checkedInTickets.set(bookingId, bookingCheckIns);

  return NextResponse.json({ success: true, message: 'Check-in successful.' });
}
