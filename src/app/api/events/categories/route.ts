
import { NextResponse } from 'next/server';
import { getEventCategories } from '@/lib/mockData';

export async function GET() {
  try {
    const categories = await getEventCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('API Error fetching event categories:', error);
    return NextResponse.json({ message: 'Failed to fetch event categories' }, { status: 500 });
  }
}
