import type { TicketType, TicketTypeFormData } from '@/lib/types';
import { TICKET_TYPES_API_URL } from '@/lib/constants';
import { parseApiDateString } from './api.service';

interface ApiTicketTypeFromEndpoint {
    id: string;
    eventId?: string | number;
    showtimeId?: string | null;
    name: string;
    price: string; 
    description?: string | null;
    availability?: string;
    createdAt?: string;
    updatedAt?: string;
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
    console.log(`Received ${apiTicketTypes.length} ticket types from API for event ${eventId}.`);
    
    const filteredApiTicketTypes = apiTicketTypes.filter(tt => String(tt.eventId) === String(eventId));
    if (filteredApiTicketTypes.length !== apiTicketTypes.length) {
        console.warn(`Client-side filter applied for ticket types of event ${eventId}. Initial: ${apiTicketTypes.length}, Filtered: ${filteredApiTicketTypes.length}. API might not be filtering correctly by eventid.`);
    }

    return filteredApiTicketTypes.map(tt => ({
      id: String(tt.id),
      eventId: String(tt.eventId),
      showtimeId: tt.showtimeId ? String(tt.showtimeId) : null,
      name: tt.name,
      price: parseFloat(tt.price) || 0,
      availability: parseInt(tt.availability || '0', 10),
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

    console.log(`[createTicketType] Creating ticket type definition.`);
    console.log(`  - URL: POST ${TICKET_TYPES_API_URL}`);
    console.log('  - Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(TICKET_TYPES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to create ticket type.' }));
        throw new Error(errorBody.message || `API error: ${response.status}`);
    }
    const newTicketTypeApi: ApiTicketTypeFromEndpoint = await response.json();
    return {
        id: String(newTicketTypeApi.id),
        eventId: String(newTicketTypeApi.eventId),
        showtimeId: newTicketTypeApi.showtimeId ? String(newTicketTypeApi.showtimeId) : null,
        name: newTicketTypeApi.name,
        price: parseFloat(newTicketTypeApi.price),
        availability: parseInt(newTicketTypeApi.availability || '0', 10),
        description: newTicketTypeApi.description || null,
        createdAt: parseApiDateString(newTicketTypeApi.createdAt),
        updatedAt: parseApiDateString(newTicketTypeApi.updatedAt),
    };
};

export const deleteTicketType = async (ticketTypeId: string): Promise<boolean> => {
  if (!TICKET_TYPES_API_URL) {
    throw new Error("TICKET_TYPES_API_URL is not defined.");
  }
  const url = `${TICKET_TYPES_API_URL}/${ticketTypeId}`;
  console.log(`[deleteTicketType] Deleting ticket type. URL: DELETE ${url}`);
  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to delete ticket type ${ticketTypeId} and parse error response.` }));
      throw new Error(errorBody.message || `API error deleting ticket type ${ticketTypeId}: ${response.status}`);
    }
    console.log(`[deleteTicketType] Successfully deleted ticket type ${ticketTypeId}.`);
    return true;
  } catch (error) {
    console.error(`[deleteTicketType] Error deleting ticket type ${ticketTypeId}:`, error);
    throw error;
  }
};
