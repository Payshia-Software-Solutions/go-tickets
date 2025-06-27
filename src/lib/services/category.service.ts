import type { Category, CategoryFormData } from '@/lib/types';
import { EXTERNAL_CATEGORY_API_URL, INTERNAL_PUBLIC_CATEGORY_API_URL } from '@/lib/constants';
import { parseApiDateString } from './api.service';

export const fetchPublicEventCategoriesFromApi = async (): Promise<Category[]> => {
    try {
      const response = await fetch(INTERNAL_PUBLIC_CATEGORY_API_URL);
      if (!response.ok) {
        const errorBodyText = await response.text();
        console.error(`API Error fetching public categories from internal route (${INTERNAL_PUBLIC_CATEGORY_API_URL}): ${response.status} - ${errorBodyText}`);
        return [];
      }
      const categories: Category[] = await response.json();
      return categories.map(cat => ({
          ...cat,
          id: String(cat.id),
          name: cat.name.trim(),
          createdAt: parseApiDateString(cat.createdAt),
          updatedAt: parseApiDateString(cat.updatedAt)
      }));
    } catch (error) {
      console.error(`Network error fetching public categories from internal route: ${INTERNAL_PUBLIC_CATEGORY_API_URL}`, error);
      return [];
    }
  };

export const getEventCategories = async (): Promise<Category[]> => {
    return fetchPublicEventCategoriesFromApi();
};

export const adminGetAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(EXTERNAL_CATEGORY_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    const categories: Category[] = await response.json();
    return categories.map(cat => ({
        ...cat,
        id: String(cat.id),
        name: cat.name.trim(),
        createdAt: parseApiDateString(cat.createdAt),
        updatedAt: parseApiDateString(cat.updatedAt)
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error in adminGetAllCategories:", error);
    return [];
  }
};

export const getCategoryById = async (id: string | number): Promise<Category | null> => {
  try {
    const response = await fetch(`${EXTERNAL_CATEGORY_API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch category ${id}: ${response.status}`);
    }
    const category: Category = await response.json();
    return {
        ...category,
        id: String(category.id),
        createdAt: parseApiDateString(category.createdAt),
        updatedAt: parseApiDateString(category.updatedAt)
    };
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return null;
  }
};

export const createCategory = async (data: CategoryFormData): Promise<Category> => {
  try {
    const response = await fetch(EXTERNAL_CATEGORY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to create category and parse error' }));
      throw new Error(errorBody.message || `Failed to create category: ${response.status}`);
    }
    const newCategory: Category = await response.json();
    return {
        ...newCategory,
        id: String(newCategory.id),
        createdAt: parseApiDateString(newCategory.createdAt),
        updatedAt: parseApiDateString(newCategory.updatedAt)
    };
  } catch (error) {
    console.error("Error in createCategory:", error);
    throw error;
  }
};

export const updateCategory = async (categoryId: string | number, data: CategoryFormData): Promise<Category | null> => {
  try {
    const response = await fetch(`${EXTERNAL_CATEGORY_API_URL}/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to update category and parse error' }));
      throw new Error(errorBody.message || `Failed to update category ${categoryId}: ${response.status}`);
    }
    const updatedCategory: Category = await response.json();
    return {
        ...updatedCategory,
        id: String(updatedCategory.id),
        createdAt: parseApiDateString(updatedCategory.createdAt),
        updatedAt: parseApiDateString(updatedCategory.updatedAt)
    };
  } catch (error) {
    console.error("Error in updateCategory:", error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string | number): Promise<boolean> => {
  try {
    const response = await fetch(`${EXTERNAL_CATEGORY_API_URL}/${categoryId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
       const errorBody = await response.json().catch(() => ({ message: 'Failed to delete category and parse error response.' }));
      if (errorBody.message && errorBody.message.toLowerCase().includes("in use")) {
          throw new Error(`Cannot delete category: It is currently in use by one or more events.`);
      }
      throw new Error(errorBody.message || `Failed to delete category ${categoryId}: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
};
