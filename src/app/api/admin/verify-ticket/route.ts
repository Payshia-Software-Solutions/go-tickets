
import { NextResponse } from 'next/server';
import { getBookingByQrCode } from '@/lib/mockData';
import type { Booking } from '@/lib/types';

// In-memory store for scanned tickets for this server session.
// In a real app, this would be a database check.
const scannedBookingIds = new Map<string, { scannedAt: string }>();

export async function POST(request: Request) {
  try {
    // The value from the QR code is sent as `bookingId` from the frontend
    const { bookingId: qrCodeValue } = await request.json();

    if (!qrCodeValue || typeof qrCodeValue !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid QR Code: No Value provided.' }, { status: 400 });
    }

    // Use the correct function to look up by QR value
    const booking = await getBookingByQrCode(qrCodeValue);

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Ticket Not Found' }, { status: 404 });
    }

    // Use the stable booking.id as the key for tracking scanned tickets
    if (scannedBookingIds.has(booking.id)) {
      const scanInfo = scannedBookingIds.get(booking.id);
      // Add scannedAt to booking object for response
      const previouslyScannedBooking: Booking = { ...booking, scannedAt: scanInfo!.scannedAt };
      return NextResponse.json({ success: false, message: 'Already Scanned', booking: previouslyScannedBooking });
    }

    // Mark as scanned using the booking ID
    const scannedAt = new Date().toISOString();
    scannedBookingIds.set(booking.id, { scannedAt });

    // Add scannedAt to booking object for response
    const validBooking: Booking = { ...booking, scannedAt };

    return NextResponse.json({ success: true, message: 'Ticket Valid', booking: validBooking });

  } catch (error) {
    console.error('API Error verifying ticket:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
  }
}
