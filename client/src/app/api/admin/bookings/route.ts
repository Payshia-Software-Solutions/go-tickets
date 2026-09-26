
import { NextResponse } from 'next/server';
import { adminGetAllBookings } from '@/lib/mockData';

export async function GET() {
  try {
    const bookings = await adminGetAllBookings();
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('API Error fetching all admin bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}
