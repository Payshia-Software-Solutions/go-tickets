
import { NextResponse } from 'next/server';
import { getOrganizerById, updateOrganizer, deleteOrganizer } from '@/lib/mockData';
import type { OrganizerFormData } from '@/lib/types';

interface Context {
  params: Promise<{ organizerId: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const { organizerId } = await params;
  try {
    const organizer = await getOrganizerById(organizerId);
    if (!organizer) {
      return NextResponse.json({ message: 'Organizer not found' }, { status: 404 });
    }
    return NextResponse.json(organizer);
  } catch (error) {
    console.error(`API Error fetching organizer ${organizerId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch organizer' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { organizerId } = await params;
  try {
    const body: OrganizerFormData = await request.json();
    const updated = await updateOrganizer(organizerId, body);
    if (!updated) {
      return NextResponse.json({ message: 'Organizer not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`API Error updating organizer ${organizerId}:`, error);
     if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json({ message: 'Invalid organizer data provided', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to update organizer' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { organizerId } = await params;
  try {
    const success = await deleteOrganizer(organizerId);
    if (!success) {
      return NextResponse.json({ message: 'Organizer not found or deletion failed (possibly in use)' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Organizer deleted successfully' });
  } catch (error) {
    console.error(`API Error deleting organizer ${organizerId}:`, error);
    return NextResponse.json({ message: 'Failed to delete organizer' }, { status: 500 });
  }
}
