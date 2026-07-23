
import { NextResponse } from 'next/server';
import { adminGetAllEvents, createEvent } from '@/lib/mockData';
import { CoreEventFormSchema } from '@/lib/types';

export async function GET() {
  try {
    const events = await adminGetAllEvents();
    return NextResponse.json(events);
  } catch (error: unknown) {
    console.error('API Error fetching all admin events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // The body is CoreEventFormData from the client, which might have a date string.
    // We convert it to a Date object for validation.
    const bodyWithParsedDate = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
    };

    const validatedData = CoreEventFormSchema.safeParse(bodyWithParsedDate);

    if (!validatedData.success) {
      console.error('API Validation Error creating core event:', validatedData.error.flatten().fieldErrors);
      return NextResponse.json(
        { message: 'Invalid core event data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    // The createEvent function handles the call to the external API
    const newEventId = await createEvent(validatedData.data);
    
    // The client expects a JSON object with the newEventId
    return NextResponse.json({ newEventId }, { status: 201 });

  } catch (error: unknown) {
    console.error('API Error creating event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
