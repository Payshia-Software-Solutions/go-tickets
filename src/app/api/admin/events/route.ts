
import { NextResponse } from 'next/server';
import { adminGetAllEvents, createEvent } from '@/lib/mockData'; // getEventById removed as it's not used here
import type { EventFormData } from '@/lib/types';
import { EventFormSchema } from '@/lib/types'; // Import Zod schema for validation

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
    const body = await request.json();
    const validatedData = EventFormSchema.safeParse(body);

    if (!validatedData.success) {
      console.error('API Validation Error creating event:', validatedData.error.flatten().fieldErrors);
      return NextResponse.json(
        { message: 'Invalid event data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const newEvent = await createEvent(validatedData.data);
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error: any) {
    console.error('API Error creating event:', error);
    return NextResponse.json({ message: error.message || 'Failed to create event' }, { status: 500 });
  }
}
