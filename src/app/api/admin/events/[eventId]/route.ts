
import { NextResponse } from 'next/server';
import { getEventById, updateEvent, deleteEvent } from '@/lib/mockData';
import { EventFormSchema } from '@/lib/types';

interface Context {
  params: { eventId: string };
}

// Interface for the raw show time object from the request body before date parsing
interface RawShowTimeInput {
  id?: string;
  dateTime: string; // Expecting string from JSON
  ticketAvailabilities: Array<{
    id?: string;
    ticketTypeId: string;
    ticketTypeName: string;
    availableCount: number;
  }>;
  // Add other properties of a show time if they exist in the raw input
  [key: string]: unknown; // Allow other properties from ...st
}


export async function GET(request: Request, { params }: Context) {
  try {
    const event = await getEventById(params.eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error: unknown) {
    console.error(`API Error fetching event ${params.eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const body = await request.json();

    // Parse date strings into Date objects before validation
    const bodyWithParsedDates = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      showTimes: body.showTimes?.map((st: RawShowTimeInput) => ({
        ...st,
        dateTime: st.dateTime ? new Date(st.dateTime) : undefined,
      })) || [],
    };
    
    const validatedData = EventFormSchema.safeParse(bodyWithParsedDates);

    if (!validatedData.success) {
      console.error(`API Validation Error updating event ${params.eventId}:`, validatedData.error.flatten().fieldErrors);
      return NextResponse.json(
        { message: 'Invalid event data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateEvent(params.eventId, validatedData.data);
    if (!updated) {
      // updateEvent might throw specific errors (e.g., about bookings) which will be caught below
      return NextResponse.json({ message: 'Event not found or update failed (no specific error from service)' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error(`API Error updating event ${params.eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    await deleteEvent(params.eventId);
    return NextResponse.json({ message: 'Event deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error(`API Error deleting event ${params.eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

