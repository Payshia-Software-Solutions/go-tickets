
import { NextResponse } from 'next/server';
import { getEventById, updateEvent, deleteEvent } from '@/lib/mockData';
import type { EventFormData } from '@/lib/types';

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
    const body: EventFormData = await request.json();
    const updated = await updateEvent(params.eventId, body);
    if (!updated) {
      return NextResponse.json({ message: 'Event not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`API Error updating event ${params.eventId}:`, error);
    if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json({ message: 'Invalid event data provided', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const success = await deleteEvent(params.eventId);
    if (!success) {
      return NextResponse.json({ message: 'Event not found or deletion failed' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Event deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`API Error deleting event ${params.eventId}:`, error);
    return NextResponse.json({ message: 'Failed to delete event' }, { status: 500 });
  }
}
