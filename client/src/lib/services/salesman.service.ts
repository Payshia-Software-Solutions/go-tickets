import type { Salesman, SalesmanFormData } from '@/lib/types';
import { SALESMEN_API_URL } from '@/lib/constants';

interface RawApiSalesman {
  id: string | number;
  name: string;
  phone?: string | null;
  email?: string | null;
  code?: string | null;
  status: 'active' | 'inactive';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

const mapApiSalesmanToAppSalesman = (item: RawApiSalesman): Salesman => ({
  id: item.id,
  name: item.name,
  phone: item.phone || '',
  email: item.email || '',
  code: item.code || '',
  status: item.status || 'active',
  notes: item.notes || '',
  created_at: item.created_at,
  updated_at: item.updated_at,
});

export const getAllSalesmen = async (): Promise<Salesman[]> => {
  try {
    const response = await fetch(`${SALESMEN_API_URL}/`, { cache: 'no-store' });
    if (!response.ok) {
      console.error("API Error fetching salesmen:", response.status);
      return [];
    }
    const data = await response.json();
    const list: RawApiSalesman[] = Array.isArray(data) ? data : data.data || [];
    return list.map(mapApiSalesmanToAppSalesman).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching salesmen:", error);
    return [];
  }
};

export const getActiveSalesmen = async (): Promise<Salesman[]> => {
  try {
    const response = await fetch(`${SALESMEN_API_URL}/active/`, { cache: 'no-store' });
    if (!response.ok) {
      console.error("API Error fetching active salesmen:", response.status);
      return [];
    }
    const data = await response.json();
    const list: RawApiSalesman[] = Array.isArray(data) ? data : data.data || [];
    return list.map(mapApiSalesmanToAppSalesman).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching active salesmen:", error);
    return [];
  }
};

export const getSalesmanById = async (id: string | number): Promise<Salesman | null> => {
  try {
    const response = await fetch(`${SALESMEN_API_URL}/${id}/`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return mapApiSalesmanToAppSalesman(data);
  } catch (error) {
    console.error("Error fetching salesman by id:", error);
    return null;
  }
};

export const createSalesman = async (data: SalesmanFormData): Promise<Salesman | null> => {
  try {
    const response = await fetch(`${SALESMEN_API_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create salesman');
    }
    const resData = await response.json();
    return {
      id: resData.id,
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      code: data.code || '',
      status: data.status || 'active',
      notes: data.notes || '',
    };
  } catch (error) {
    console.error("Error creating salesman:", error);
    throw error;
  }
};

export const updateSalesman = async (id: string | number, data: Partial<SalesmanFormData>): Promise<boolean> => {
  try {
    const response = await fetch(`${SALESMEN_API_URL}/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update salesman');
    }
    return true;
  } catch (error) {
    console.error("Error updating salesman:", error);
    throw error;
  }
};

export const deleteSalesman = async (id: string | number): Promise<boolean> => {
  try {
    const response = await fetch(`${SALESMEN_API_URL}/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete salesman');
    }
    return true;
  } catch (error) {
    console.error("Error deleting salesman:", error);
    throw error;
  }
};
