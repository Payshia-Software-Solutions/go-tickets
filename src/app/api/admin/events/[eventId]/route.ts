
import { NextResponse } from 'next/server';
import { getEventById, updateEvent, deleteEvent } from '@/lib/mockData';
import type { EventFormData } from '@/lib/types';
import { EventFormSchema } from '@/lib/types'; // Import Zod schema for validation

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
    const validatedData = EventFormSchema.safeParse(body);

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
     // If the service layer threw a specific error message, use it
    if (error.message) {
        return NextResponse.json({ message: error.message }, { status: 400 }); // Or appropriate status
    }
    return NextResponse.json({ message: 'Failed to delete event' }, { status: 500 });
  }
}
