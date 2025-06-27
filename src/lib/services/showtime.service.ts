import type { ShowTime, AddShowTimeFormData } from '@/lib/types';
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

export const createShowTime = async (eventId: string, data: AddShowTimeFormData): Promise<ShowTime> => {
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
    const newShowTimeApi: ApiShowTimeFlat = await response.json();
    return {
        id: newShowTimeApi.id,
        eventId: String(newShowTimeApi.eventId || eventId),
        dateTime: parseApiDateString(newShowTimeApi.dateTime) || new Date().toISOString(),
        ticketAvailabilities: [],
    };
};
