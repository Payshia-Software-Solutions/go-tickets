
import { NextResponse } from 'next/server';
import { adminGetAllOrganizers, createOrganizer } from '@/lib/mockData';
import type { OrganizerFormData } from '@/lib/types';

export async function GET() {
  try {
    const organizers = await adminGetAllOrganizers();
    return NextResponse.json(organizers);
  } catch (error) {
    console.error('API Error fetching all admin organizers:', error);
    return NextResponse.json({ message: 'Failed to fetch organizers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: OrganizerFormData = await request.json();
    const newOrganizer = await createOrganizer(body);
    return NextResponse.json(newOrganizer, { status: 201 });
  } catch (error) {
    console.error('API Error creating organizer:', error);
    if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json({ message: 'Invalid organizer data provided', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create organizer' }, { status: 500 });
  }
}
