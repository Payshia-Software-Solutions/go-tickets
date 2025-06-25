import { NextResponse } from 'next/server';
import { getBookingById } from '@/lib/mockData';
import type { Booking } from '@/lib/types';

// In-memory store for scanned tickets for this server session.
// In a real app, this would be a database check.
const scannedBookingIds = new Map<string, { scannedAt: string }>();

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid QR Code: No Booking ID provided.' }, { status: 400 });
    }

    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Ticket Not Found' }, { status: 404 });
    }

    if (scannedBookingIds.has(bookingId)) {
      const scanInfo = scannedBookingIds.get(bookingId);
      // Add scannedAt to booking object for response
      const previouslyScannedBooking: Booking = { ...booking, scannedAt: scanInfo!.scannedAt };
      return NextResponse.json({ success: false, message: 'Already Scanned', booking: previouslyScannedBooking });
    }

    // Mark as scanned
    const scannedAt = new Date().toISOString();
    scannedBookingIds.set(bookingId, { scannedAt });

    // Add scannedAt to booking object for response
    const validBooking: Booking = { ...booking, scannedAt };

    return NextResponse.json({ success: true, message: 'Ticket Valid', booking: validBooking });

  } catch (error) {
    console.error('API Error verifying ticket:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
  }
}
