
import { NextResponse } from 'next/server';
import { getAdminEventById, updateEvent, deleteEvent } from '@/lib/mockData';
import { EventFormSchema } from '@/lib/types';

interface Context {
  params: Promise<{ eventId: string }>;
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
  const { eventId } = await params;
  try {
    const event = await getAdminEventById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error: unknown) {
    console.error(`API Error fetching event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { eventId } = await params;
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
      console.error(`API Validation Error updating event ${eventId}:`, validatedData.error.flatten().fieldErrors);
      return NextResponse.json(
        { message: 'Invalid event data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const initialEvent = await getAdminEventById(eventId);
    if (!initialEvent) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    await updateEvent(eventId, validatedData.data, initialEvent, null);
    return NextResponse.json({ message: 'Event updated successfully' });
  } catch (error: unknown) {
    console.error(`API Error updating event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { eventId } = await params;
  try {
    await deleteEvent(eventId);
    return NextResponse.json({ message: 'Event deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error(`API Error deleting event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
