
import type { TicketType, TicketTypeFormData } from '@/lib/types';
import { TICKET_TYPES_API_URL } from '@/lib/constants';
import { parseApiDateString } from './api.service';

interface ApiTicketTypeFromEndpoint {
    id: string | number;
    eventId?: string | number;
    showtimeId?: string | number | null;
    name: string;
    price: string | number; 
    description?: string | null;
    availability?: string | number;
    createdAt?: string;
    updatedAt?: string;
}

interface CreateTicketTypeResponse {
    message: string;
    id: string | number;
}

export const fetchTicketTypesForEvent = async (eventId: string): Promise<TicketType[]> => {
  if (!TICKET_TYPES_API_URL) {
    console.warn("TICKET_TYPES_API_URL is not defined. Cannot fetch ticket types.");
    return [];
  }
  const url = `${TICKET_TYPES_API_URL}?eventid=${eventId}`;
  try {
    console.log(`Fetching ticket types for event ${eventId} from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      console.error(`API Error fetching ticket types for event ${eventId}:`, response.status, await response.text());
      return [];
    }
    const apiTicketTypes: ApiTicketTypeFromEndpoint[] = await response.json();
    
    const filteredApiTicketTypes = apiTicketTypes.filter(tt => String(tt.eventId) === String(eventId));

    return filteredApiTicketTypes.map(tt => ({
      id: String(tt.id),
      eventId: String(tt.eventId),
      showtimeId: tt.showtimeId ? String(tt.showtimeId) : null,
      name: tt.name,
      price: parseFloat(String(tt.price)) || 0,
      availability: parseInt(String(tt.availability || '0'), 10),
      description: tt.description || null,
      createdAt: parseApiDateString(tt.createdAt),
      updatedAt: parseApiDateString(tt.updatedAt),
    }));
  } catch (error) {
    console.error(`Network error fetching ticket types for event ${eventId}:`, error);
    return [];
  }
};

export const createTicketType = async (eventId: string, data: TicketTypeFormData): Promise<TicketType> => {
    const payload = {
      name: data.name,
      price: data.price,
      description: data.description || "",
      availability: data.availability,
      eventId: parseInt(eventId, 10),
      showtimeId: data.showtimeId ? parseInt(data.showtimeId, 10) : undefined,
    };

    const response = await fetch(TICKET_TYPES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to create ticket type.' }));
        throw new Error(errorBody.message || `API error: ${response.status}`);
    }
    
    const newTicketTypeResponse: CreateTicketTypeResponse = await response.json();
    if (!newTicketTypeResponse.id) {
        throw new Error("API did not return an ID for the newly created ticket type.");
    }

    return {
        id: String(newTicketTypeResponse.id),
        eventId: eventId,
        showtimeId: data.showtimeId || null,
        name: data.name,
        price: data.price,
        availability: data.availability,
        description: data.description || null,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
    };
};

export const updateTicketType = async (ticketTypeId: string, data: TicketTypeFormData, eventId: string): Promise<TicketType> => {
    if (!TICKET_TYPES_API_URL) {
        throw new Error("TICKET_TYPES_API_URL is not configured.");
    }
    const url = `${TICKET_TYPES_API_URL}/${ticketTypeId}`;
    const payload = {
      name: data.name,
      price: data.price,
      description: data.description || "",
      availability: data.availability,
      eventId: parseInt(eventId, 10),
      showtimeId: data.showtimeId ? parseInt(data.showtimeId, 10) : undefined,
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to update ticket type.' }));
        throw new Error(errorBody.message || `API error updating ticket type: ${response.status}`);
    }
    const updatedTicketType: ApiTicketTypeFromEndpoint = await response.json();
     return {
        id: String(updatedTicketType.id),
        eventId: updatedTicketType.eventId ? String(updatedTicketType.eventId) : undefined,
        showtimeId: updatedTicketType.showtimeId ? String(updatedTicketType.showtimeId) : null,
        name: updatedTicketType.name,
        price: parseFloat(String(updatedTicketType.price)) || 0,
        availability: parseInt(String(updatedTicketType.availability || '0'), 10),
        description: updatedTicketType.description || null,
        createdAt: parseApiDateString(updatedTicketType.createdAt),
        updatedAt: parseApiDateString(updatedTicketType.updatedAt),
    };
};

export const deleteTicketType = async (ticketTypeId: string): Promise<boolean> => {
  if (!TICKET_TYPES_API_URL) {
    throw new Error("TICKET_TYPES_API_URL is not defined.");
  }
  const url = `${TICKET_TYPES_API_URL}/${ticketTypeId}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to delete ticket type ${ticketTypeId} and parse error response.` }));
      throw new Error(errorBody.message || `API error deleting ticket type ${ticketTypeId}: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`[deleteTicketType] Error deleting ticket type ${ticketTypeId}:`, error);
    throw error;
  }
};

interface AvailabilityResponse {
  available: number;
  booked: string;
  released: string;
}

export const getTicketAvailabilityCount = async (eventId: string, showtimeId: string, ticketTypeId: string): Promise<number> => {
    const url = `https://gotickets-server.payshia.com/events/get/booked-tickets-count/?eventId=${eventId}&showtimeId=${showtimeId}&ticketTypeId=${ticketTypeId}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch availability for t:${ticketTypeId} s:${showtimeId} e:${eventId}. Status: ${response.status}`);
            return 0; 
        }
        const data: AvailabilityResponse = await response.json();
        return data.available || 0;
    } catch (error) {
        console.error(`Network error fetching availability for t:${ticketTypeId} s:${showtimeId} e:${eventId}`, error);
        return 0;
    }
};
