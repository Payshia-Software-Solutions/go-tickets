
import type { ShowTime, AddShowTimeFormData, ShowTimeFormData } from '@/lib/types';
import { SHOWTIMES_API_URL, SHOWTIMES_BY_EVENT_API_URL_BASE } from '@/lib/constants';
import { parseApiDateString } from './api.service';
import { format } from 'date-fns';

interface ApiShowTimeFlat {
  id: string;
  eventId?: string;
  dateTime: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateShowTimeResponse {
  message: string;
  showtimeId: string | number;
}

export const getShowTimesForEvent = async (eventId: string): Promise<ShowTime[]> => {
  if (!SHOWTIMES_BY_EVENT_API_URL_BASE) {
    console.warn("SHOWTIMES_BY_EVENT_API_URL_BASE is not defined, cannot fetch showtimes.");
    return [];
  }
  const url = `${SHOWTIMES_BY_EVENT_API_URL_BASE}/${eventId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return [];
      console.error(`API Error fetching showtimes for event ${eventId} from ${url}:`, response.status, await response.text());
      return [];
    }
    const apiShowTimes: ApiShowTimeFlat[] = await response.json();
    return apiShowTimes.map(st => ({
      id: st.id,
      eventId: st.eventId || eventId,
      dateTime: parseApiDateString(st.dateTime) || new Date().toISOString(),
      ticketAvailabilities: [],
      createdAt: parseApiDateString(st.createdAt),
      updatedAt: parseApiDateString(st.updatedAt),
    }));
  } catch (error) {
    console.error(`Network error fetching showtimes for event ${eventId} from ${url}:`, error);
    return [];
  }
};

export const createShowTime = async (eventId: string, data: AddShowTimeFormData): Promise<{ id: string; dateTime: string; }> => {
    if (!SHOWTIMES_API_URL) {
        throw new Error("SHOWTIMES_API_URL is not configured.");
    }
    const payload = {
      eventId: parseInt(eventId, 10),
      dateTime: format(data.dateTime, "yyyy-MM-dd HH:mm:ss"),
    };
    console.log(`[createShowTime] Creating showtime. URL: POST ${SHOWTIMES_API_URL}`, 'Payload:', payload);
    const response = await fetch(SHOWTIMES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to create show time.' }));
        throw new Error(errorBody.message || `API error: ${response.status}`);
    }
    
    const newShowTimeResponse: CreateShowTimeResponse = await response.json();
    if (!newShowTimeResponse.showtimeId) {
        throw new Error("API did not return a showtimeId after creating a showtime.");
    }

    return {
        id: String(newShowTimeResponse.showtimeId),
        dateTime: data.dateTime.toISOString(), // Return dateTime as ISO string for consistency
    };
};

export const updateShowTime = async (showTimeId: string, data: ShowTimeFormData): Promise<ShowTime> => {
    if (!SHOWTIMES_API_URL) {
        throw new Error("SHOWTIMES_API_URL is not configured.");
    }
    const url = `${SHOWTIMES_API_URL}/${showTimeId}`;
    const payload = {
        dateTime: format(data.dateTime, "yyyy-MM-dd HH:mm:ss"),
        ticketAvailabilities: data.ticketAvailabilities.map(avail => ({
            id: avail.id?.includes('sta-') ? undefined : avail.id, // Don't send temporary frontend IDs
            ticket_type_id: avail.ticketTypeId,
            available_count: avail.availableCount,
        }))
    };
    console.log(`[updateShowTime] Updating showtime. URL: PUT ${url}`, 'Payload:', payload);
    const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to update show time.' }));
        throw new Error(errorBody.message || `API error updating showtime: ${response.status}`);
    }
    const updatedShowTime = await response.json();
    return {
      ...updatedShowTime,
      id: String(updatedShowTime.id),
      dateTime: parseApiDateString(updatedShowTime.dateTime) || new Date().toISOString(),
      ticketAvailabilities: updatedShowTime.ticketAvailabilities || [],
    };
};

export const deleteShowTime = async (showTimeId: string): Promise<boolean> => {
    if (!SHOWTIMES_API_URL) {
        throw new Error("SHOWTIMES_API_URL is not configured.");
    }
    const url = `${SHOWTIMES_API_URL}/${showTimeId}`;
    console.log(`[deleteShowTime] Deleting showtime. URL: DELETE ${url}`);
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to delete show time.' }));
        throw new Error(errorBody.message || `API error deleting showtime: ${response.status}`);
    }
    return response.ok;
};
