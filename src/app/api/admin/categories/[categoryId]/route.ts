
import { NextResponse } from 'next/server';
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/mockData'; // Updated to use API-backed functions
import { CategoryFormSchema } from '@/lib/types';

interface Context {
  params: { categoryId: string };
}

export async function GET(request: Request, { params }: Context) {
  try {
    // getCategoryById now fetches from the external API (or filters a fetched list) via mockData
    const category = await getCategoryById(params.categoryId); 
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (error) {
    console.error(`API Error fetching category ${params.categoryId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const body = await request.json();
    const validatedData = CategoryFormSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { message: 'Invalid category data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // updateCategory now puts to the external API via mockData
    const updated = await updateCategory(params.categoryId, validatedData.data); 
    if (!updated) {
      return NextResponse.json({ message: 'Category not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
    console.error(`API Error updating category ${params.categoryId}:`, error);
    if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ message: "A category with this name already exists." }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    // deleteCategory now deletes via the external API through mockData
    await deleteCategory(params.categoryId); 
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete category. It might be in use.';
    console.error(`API Error deleting category ${params.categoryId}:`, error);
     if (errorMessage.toLowerCase().includes("in use")) {
        return NextResponse.json({ message: errorMessage }, { status: 400 }); 
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
