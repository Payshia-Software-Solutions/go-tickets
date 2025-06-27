import type { Organizer, OrganizerFormData } from '@/lib/types';
import { ORGANIZERS_API_URL } from '@/lib/constants';
import { parseApiDateString } from './api.service';

interface RawApiOrganizer {
  id: string | number;
  name: string;
  contactEmail: string;
  website?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const mapApiOrganizerToAppOrganizer = (apiOrganizer: RawApiOrganizer): Organizer => {
  return {
    id: String(apiOrganizer.id),
    name: apiOrganizer.name,
    contactEmail: apiOrganizer.contactEmail,
    website: apiOrganizer.website || null,
    createdAt: parseApiDateString(apiOrganizer.createdAt),
    updatedAt: parseApiDateString(apiOrganizer.updatedAt),
  };
};

export const adminGetAllOrganizers = async (): Promise<Organizer[]> => {
  try {
    const response = await fetch(ORGANIZERS_API_URL);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to fetch organizers and parse error response.' }));
      console.error("API Error fetching organizers:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to fetch organizers: ${response.status}`);
    }
    const responseData = await response.json();
    const apiOrganizers: RawApiOrganizer[] = Array.isArray(responseData) ? responseData : responseData.data || responseData.organizers || [];

    if (!Array.isArray(apiOrganizers)) {
        console.error("Organizers data from API is not an array. Received:", apiOrganizers);
        return [];
    }
    return apiOrganizers.map(mapApiOrganizerToAppOrganizer).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Network or other error fetching organizers:", error);
    return [];
  }
};

export const getOrganizerById = async (id: string): Promise<Organizer | null> => {
  if (!id || id === "undefined" || id === "null") {
    console.warn("getOrganizerById called with invalid ID:", id);
    return null;
  }
  try {
    const response = await fetch(`${ORGANIZERS_API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      const errorBody = await response.json().catch(() => ({ message: `Failed to fetch organizer ${id} and parse error response.` }));
      console.error("API Error fetching organizer by ID:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to fetch organizer ${id}: ${response.status}`);
    }
    const apiOrganizer: RawApiOrganizer = await response.json();
    return mapApiOrganizerToAppOrganizer(apiOrganizer);
  } catch (error) {
    console.error(`Network or other error fetching organizer ${id}:`, error);
    return null;
  }
};

export const createOrganizer = async (data: OrganizerFormData): Promise<Organizer> => {
  try {
    const response = await fetch(ORGANIZERS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to create organizer and parse error response.' }));
      console.error("API Error creating organizer:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to create organizer: ${response.status}`);
    }
    const newApiOrganizer: RawApiOrganizer = await response.json();
    return mapApiOrganizerToAppOrganizer(newApiOrganizer);
  } catch (error) {
    console.error("Network or other error creating organizer:", error);
    throw error;
  }
};

export const updateOrganizer = async (organizerId: string, data: OrganizerFormData): Promise<Organizer | null> => {
  try {
    const response = await fetch(`${ORGANIZERS_API_URL}/${organizerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      const errorBody = await response.json().catch(() => ({ message: `Failed to update organizer ${organizerId} and parse error response.` }));
      console.error("API Error updating organizer:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to update organizer ${organizerId}: ${response.status}`);
    }
    const updatedApiOrganizer: RawApiOrganizer = await response.json();
    return mapApiOrganizerToAppOrganizer(updatedApiOrganizer);
  } catch (error) {
    console.error(`Network or other error updating organizer ${organizerId}:`, error);
    throw error;
  }
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${ORGANIZERS_API_URL}/${organizerId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to delete organizer ${organizerId} and parse error response.` }));
      if (response.status === 400 && errorBody.message && errorBody.message.toLowerCase().includes("in use")) {
          throw new Error(`Cannot delete organizer: It is currently in use by one or more events.`);
      }
      console.error("API Error deleting organizer:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to delete organizer ${organizerId}: ${response.status}`);
    }
    return response.ok;
  } catch (error) {
    console.error(`Network or other error deleting organizer ${organizerId}:`, error);
    throw error;
  }
};
