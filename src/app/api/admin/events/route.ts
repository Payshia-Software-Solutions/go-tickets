
import { NextResponse } from 'next/server';
import { adminGetAllEvents, createEvent, getEventById } from '@/lib/mockData';
import type { EventFormData } from '@/lib/types';

export async function GET() {
  try {
    const events = await adminGetAllEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error('API Error fetching all admin events:', error);
    return NextResponse.json({ message: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: EventFormData = await request.json();
    const newEvent = await createEvent(body);
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('API Error creating event:', error);
    // Add more specific error handling based on Zod validation or Prisma errors if needed
    if (error instanceof Error && error.message.includes('validation')) { // Basic check for Zod-like error
        return NextResponse.json({ message: 'Invalid event data provided', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create event' }, { status: 500 });
  }
}
