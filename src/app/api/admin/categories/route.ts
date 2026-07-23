
import { NextResponse } from 'next/server';
import { adminGetAllCategories, createCategory } from '@/lib/mockData'; // Updated to use API-backed functions
import { CategoryFormSchema } from '@/lib/types';

export async function GET() {
  try {
    const categories = await adminGetAllCategories(); // This now fetches from the external API via mockData
    return NextResponse.json(categories);
  } catch (error) {
    console.error('API Error fetching all admin categories:', error);
    return NextResponse.json({ message: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CategoryFormSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { message: 'Invalid category data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    // createCategory now posts to the external API via mockData
    const newCategory = await createCategory(validatedData.data); 
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
    console.error('API Error creating category:', error);
    // Handle specific error for duplicate name or other API errors
    if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ message: "A category with this name already exists." }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
