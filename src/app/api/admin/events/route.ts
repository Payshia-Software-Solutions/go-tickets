import { NextResponse } from 'next/server';
import { adminGetAllEvents, createEvent } from '@/lib/mockData';
import { EventFormSchema } from '@/lib/types';

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
    // console.log("API POST /admin/events body:", JSON.stringify(body, null, 2));
    
    // Parse date strings into Date objects before validation for showTimes
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