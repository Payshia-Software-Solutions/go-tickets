
import { NextResponse } from 'next/server';
import { getEventById, updateEvent, deleteEvent } from '@/lib/mockData';
import { EventFormSchema } from '@/lib/types';

interface Context {
  params: { eventId: string };
}

export async function GET(request: Request, { params }: Context) {
  try {
    const event = await getEventById(params.eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error) {
    console.error(`API Error fetching event ${params.eventId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const body = await request.json();

    // Parse date strings into Date objects before validation
    const bodyWithParsedDates = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      showTimes: body.showTimes?.map((st: any) => ({
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
      return NextResponse.json({ message: 'Event not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API Error updating event ${params.eventId}:`, error);
    return NextResponse.json({ message: error.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    await deleteEvent(params.eventId);
    return NextResponse.json({ message: 'Event deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error deleting event ${params.eventId}:`, error);
    return NextResponse.json({ message: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
