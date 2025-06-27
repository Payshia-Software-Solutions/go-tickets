
import type { Event, Organizer, EventFormData, CoreEventFormData, ShowTime, ShowTimeTicketAvailability } from '@/lib/types';
import { API_BASE_URL, CONTENT_PROVIDER_URL } from '@/lib/constants';
import { parseApiDateString } from './api.service';
import { getOrganizerById } from './organizer.service';
import { fetchTicketTypesForEvent, getTicketAvailabilityCount } from './ticket.service';

interface ApiEventFlat {
  id: string;
  name: string;
  slug: string;
  date: string;
  location: string;
  description: string;
  category: string;
  imageUrl: string;
  venueName: string;
  venueAddress?: string | null;
  organizerId: string;
  organizer?: Organizer;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiShowTimeFlat {
  id: string;
  eventId?: string;
  dateTime: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapApiEventToAppEvent = (apiEvent: ApiEventFlat): Event => {
  let finalImageUrl = apiEvent.imageUrl;
  if (finalImageUrl && finalImageUrl.startsWith('/')) {
    finalImageUrl = `${CONTENT_PROVIDER_URL}${finalImageUrl}`;
  }

  return {
    id: apiEvent.id,
    name: apiEvent.name,
    slug: apiEvent.slug,
    date: parseApiDateString(apiEvent.date) || new Date().toISOString(),
    location: apiEvent.location,
    description: apiEvent.description,
    category: apiEvent.category,
    imageUrl: finalImageUrl,
    venueName: apiEvent.venueName,
    venueAddress: apiEvent.venueAddress,
    organizerId: apiEvent.organizerId,
    organizer: apiEvent.organizer ? {
        ...apiEvent.organizer,
        createdAt: parseApiDateString(apiEvent.organizer.createdAt),
        updatedAt: parseApiDateString(apiEvent.organizer.updatedAt),
    } : undefined,
    ticketTypes: [],
    showTimes: [],
    mapLink: `https://maps.google.com/?q=${encodeURIComponent(apiEvent.venueAddress || apiEvent.location)}`,
    createdAt: parseApiDateString(apiEvent.createdAt),
    updatedAt: parseApiDateString(apiEvent.updatedAt),
  };
};

export const fetchEventsFromApi = async (queryParams?: URLSearchParams): Promise<Event[]> => {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined");
  const url = new URL(`${API_BASE_URL}/events`);
  if (queryParams) {
    queryParams.forEach((value, key) => url.searchParams.append(key, value));
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error("API Error fetching events:", response.status, await response.text());
      return [];
    }
    const apiEvents: ApiEventFlat[] = await response.json();
    return apiEvents.map(mapApiEventToAppEvent);
  } catch (error) {
    console.error("Network error fetching events:", error);
    return [];
  }
};

export const fetchEventBySlugFromApi = async (slug: string): Promise<Event | null> => {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined");
  const url = `${API_BASE_URL}/events/slug/${slug}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`API Error fetching event by slug ${slug}:`, response.status, await response.text());
      return null;
    }
    const apiEvent: ApiEventFlat = await response.json();
    return mapApiEventToAppEvent(apiEvent);
  } catch (error) {
    console.error(`Network error fetching event by slug ${slug}:`, error);
    return null;
  }
};

export const fetchEventByIdFromApi = async (id: string): Promise<Event | null> => {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined");
  const url = `${API_BASE_URL}/events/${id}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`API Error fetching event by id ${id}:`, response.status, await response.text());
      return null;
    }
    const apiEvent: ApiEventFlat = await response.json();
    return mapApiEventToAppEvent(apiEvent);
  } catch (error) {
    console.error(`Network error fetching event by id ${id}:`, error);
    return null;
  }
};

export const getEvents = async (): Promise<Event[]> => {
  return fetchEventsFromApi();
};

export const getUpcomingEvents = async (limit: number = 8): Promise<Event[]> => {
  const allEvents = await fetchEventsFromApi();
  const now = new Date();
  return allEvents
    .filter(event => (event.date && new Date(event.date) >= now) || (event.showTimes?.some(st => new Date(st.dateTime) >= now)))
    .sort((a,b) => (a.date && b.date) ? new Date(a.date).getTime() - new Date(b.date).getTime() : 0)
    .slice(0, limit);
};

export const getPopularEvents = async (limit: number = 4): Promise<Event[]> => {
  const allEvents = await fetchEventsFromApi();
   return allEvents
    .sort((a, b) => ((b.ticketTypes?.length || 0) + (b.showTimes?.length || 0)) - ((a.ticketTypes?.length || 0) + a.showTimes?.length || 0))
    .slice(0, limit);
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string): Promise<Event[]> => {
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL is not defined. searchEvents is disabled and will return no results.");
    return [];
  }

  const params = new URLSearchParams();
  if (query) params.set('name', query);
  if (category) params.set('category', category.trim());
  if (date) params.set('date', date);
  if (location) params.set('location', location);

  if (params.toString() === '') {
    return fetchEventsFromApi();
  }
  
  const filterUrl = new URL(`${API_BASE_URL}/events/filter/`);
  filterUrl.search = params.toString();

  try {
    const response = await fetch(filterUrl.toString());

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error on filtering events: ${filterUrl.toString()}`, response.status, errorBody);
      return [];
    }

    const responseData = await response.json();

    if (responseData.success && Array.isArray(responseData.data)) {
      return responseData.data.map(mapApiEventToAppEvent);
    } else {
      console.error("Filtering API response did not match expected format {success: boolean, data: [...]}.", responseData);
      return [];
    }
  } catch (error) {
    console.error(`Network error during event filtering: ${filterUrl.toString()}`, error);
    return [];
  }
};

export const getFullEventDetails = async (eventBase: Event): Promise<Event | undefined> => {
  if (!eventBase) return undefined;
  console.log(`[getFullEventDetails] Populating details for event: ${eventBase.name} (ID: ${eventBase.id})`);
  
  try {
    if (!eventBase.organizer && eventBase.organizerId) {
      const organizerDetails = await getOrganizerById(eventBase.organizerId);
      if (organizerDetails) {
        eventBase.organizer = organizerDetails;
      } else {
        console.warn(`[getFullEventDetails] Organizer with ID ${eventBase.organizerId} not found.`);
      }
    }

    const masterTicketTypes = await fetchTicketTypesForEvent(eventBase.id);
    eventBase.ticketTypes = masterTicketTypes;
    if (masterTicketTypes.length === 0) {
      console.warn(`[getFullEventDetails] No master ticket types found for event ${eventBase.id}.`);
    }

    const populatedShowTimes: ShowTime[] = [];
    if (!API_BASE_URL) {
      console.warn("[getFullEventDetails] Showtime API URL is not configured. Cannot fetch showtimes.");
      eventBase.showTimes = [];
    } else {
      const showtimesResponse = await fetch(`${API_BASE_URL}/showtimes/event/${eventBase.id}`);
      if (!showtimesResponse.ok) {
        console.warn(`[getFullEventDetails] Failed to fetch showtimes for event ${eventBase.id}: ${showtimesResponse.status}`);
      } else {
        const basicShowTimesFromApi: ApiShowTimeFlat[] = await showtimesResponse.json();
        
        for (const basicSt of basicShowTimesFromApi) {
          const detailedShowTime: ShowTime = {
            id: basicSt.id,
            eventId: basicSt.eventId || eventBase.id,
            dateTime: parseApiDateString(basicSt.dateTime) || new Date().toISOString(),
            ticketAvailabilities: [],
            createdAt: parseApiDateString(basicSt.createdAt),
            updatedAt: parseApiDateString(basicSt.updatedAt),
          };

          const ticketsForThisShowtime = masterTicketTypes.filter(tt => tt.showtimeId === basicSt.id);

          detailedShowTime.ticketAvailabilities = await Promise.all(
            ticketsForThisShowtime.map(async (tt) => {
                const availableCount = await getTicketAvailabilityCount(eventBase.id, basicSt.id, tt.id);
                return {
                    id: `sta-${basicSt.id}-${tt.id}`,
                    showTimeId: basicSt.id,
                    ticketTypeId: tt.id,
                    ticketType: { id: tt.id, name: tt.name, price: tt.price },
                    availableCount: availableCount,
                };
            })
          );
          
          populatedShowTimes.push(detailedShowTime);
        }
      }
    }
    
    eventBase.showTimes = populatedShowTimes;
    console.log(`[getFullEventDetails] Finished populating event ${eventBase.id}. Returning with ${eventBase.showTimes.length} showtimes.`);
    return eventBase;

  } catch (error) {
    console.error(`[getFullEventDetails] A critical error occurred while populating details for event ${eventBase.id}:`, error);
    return eventBase;
  }
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  console.log(`[getEventBySlug] Fetching event by slug: ${slug}`);
  const eventBase = await fetchEventBySlugFromApi(slug);
  
  if (!eventBase) {
    console.warn(`[getEventBySlug] Event with slug "${slug}" not found via fetchEventBySlugFromApi.`);
    return undefined;
  }
  
  return getFullEventDetails(eventBase);
};

export const adminGetAllEvents = async (): Promise<Event[]> => {
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, adminGetAllEvents using local mock data.");
    return [];
  }
  try {
    const response = await fetch(`${API_BASE_URL}/events`);
    if (!response.ok) {
      console.error("API Error fetching admin events:", response.status, await response.text());
      return [];
    }
    const apiEvents: ApiEventFlat[] = await response.json();
    return apiEvents.map(mapApiEventToAppEvent);
  } catch (error) {
    console.error("Network error fetching admin events:", error);
    return [];
  }
};

export const getAdminEventById = async (id: string): Promise<Event | undefined> => {
  console.log(`[getAdminEventById] Fetching event by ID: ${id}`);
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, getAdminEventById using local mock data.");
    return undefined;
  }
  
  try {
    const eventBase = await fetchEventByIdFromApi(id);
    if (!eventBase) {
      console.warn(`[getAdminEventById] Event with ID "${id}" not found.`);
      return undefined;
    }
    
    return await getFullEventDetails(eventBase);
  } catch (error) {
    console.error(`[getAdminEventById] Error during fetch or processing for event ID ${id}:`, error);
    return undefined;
  }
};

export const createEvent = async (data: CoreEventFormData, imageFile: File | null): Promise<string> => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined. Cannot create event.");
  }
  
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('slug', data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
  formData.append('date', data.date.toISOString());
  formData.append('location', data.location);
  formData.append('description', data.description);
  formData.append('category', data.category);
  formData.append('organizerId', data.organizerId);
  formData.append('venueName', data.venueName);
  formData.append('venueAddress', data.venueAddress || '');

  if (imageFile) {
    formData.append('image', imageFile);
  } else if (data.imageUrl) {
    formData.append('imageUrl', data.imageUrl);
  }

  const eventResponse = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    body: formData,
  });

  const responseText = await eventResponse.text();

  if (!eventResponse.ok) {
    let errorMessage;
    try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || `API error creating event: ${eventResponse.status}`;
    } catch(e) {
        const cleanErrorText = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        errorMessage = `API error creating event: ${eventResponse.status}. Server response: ${cleanErrorText.substring(0, 200)}...`;
        console.error("Non-JSON error response from server:", responseText);
    }
    throw new Error(errorMessage);
  }
  
  try {
    const jsonStartIndex = responseText.indexOf('{');
    if (jsonStartIndex === -1) {
      console.error("Could not find start of JSON in successful server response:", responseText);
      throw new Error("The server returned a successful but unreadable response. It did not contain valid JSON.");
    }
    const jsonString = responseText.substring(jsonStartIndex);
    const createEventResponse: { message: string; newEventId: string | number; imageUrl: string } = JSON.parse(jsonString);
    if (!createEventResponse.newEventId) {
        throw new Error("API did not return a newEventId for the newly created event.");
    }
    return String(createEventResponse.newEventId);
  } catch (e) {
      console.error("Failed to parse successful JSON response from createEvent:", responseText);
      throw new Error("The server returned a successful but invalid response. Please check server logs.");
  }
};

export const updateEvent = async (
  eventId: string, 
  data: EventFormData, 
  initialData: Event,
  imageFile: File | null
): Promise<void> => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined. Cannot update event.");
  }
  
  console.log(`%c[updateEvent] Starting FormData update for event ID: ${eventId}`, 'color: #8833ff; font-weight: bold;');
  
  const formData = new FormData();
  
  formData.append('_method', 'PUT');

  formData.append('name', data.name);
  formData.append('slug', data.slug);
  formData.append('date', data.date.toISOString());
  formData.append('location', data.location);
  formData.append('description', data.description);
  formData.append('category', data.category);
  formData.append('organizerId', data.organizerId);
  formData.append('venueName', data.venueName);
  formData.append('venueAddress', data.venueAddress || '');

  if (imageFile) {
    formData.append('image', imageFile);
  } else if (data.imageUrl) {
    let imageUrlToSend = data.imageUrl;
    if (imageUrlToSend.startsWith(CONTENT_PROVIDER_URL)) {
      imageUrlToSend = imageUrlToSend.substring(CONTENT_PROVIDER_URL.length);
    }
    formData.append('imageUrl', imageUrlToSend);
  }
  
  formData.append('ticketTypes', JSON.stringify(data.ticketTypes));
  formData.append('showTimes', JSON.stringify(data.showTimes));
  
  const updateUrl = `${API_BASE_URL}/events/${eventId}`;
  
  console.log(`%c[updateEvent] Sending FormData to backend...`, 'color: blue;');
  console.log(`  - URL: POST ${updateUrl}`);
  
  const response = await fetch(updateUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || `API error updating event ${eventId}: ${response.status}`;
    } catch(e) {
        const cleanErrorText = errorText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        errorMessage = `API error updating event ${eventId}: ${response.status}. Server response: ${cleanErrorText.substring(0, 200)}...`;
        console.error("Non-JSON error response from server:", errorText);
    }
    throw new Error(errorMessage);
  }
  
  console.log(`%c[updateEvent] FormData update complete for event ID: ${eventId}.`, 'color: #8833ff; font-weight: bold;');
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
    if (API_BASE_URL) {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: 'Failed to delete event via API and parse error' }));
            throw new Error(errorBody.message || `API error deleting event ${eventId}: ${response.status}`);
        }
        return response.ok;
    } else {
        console.warn(`API_BASE_URL not set, deleteEvent using local mock data for event ID: ${eventId}.`);
        return false;
    }
};

export const getEventSuggestionsByName = async (nameQuery: string): Promise<Event[]> => {
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL is not defined. Event suggestions are disabled.");
    return [];
  }
  if (!nameQuery || nameQuery.trim().length < 1) {
    return [];
  }

  const suggestionUrl = new URL(`${API_BASE_URL}/events/search/name/`);
  suggestionUrl.searchParams.set('name', nameQuery.trim());

  try {
    const response = await fetch(suggestionUrl.toString());
    if (!response.ok) {
      console.error(`API Error on fetching suggestions for "${nameQuery}":`, response.status, await response.text());
      return [];
    }
    const responseData = await response.json();
    if (responseData.success && Array.isArray(responseData.data)) {
      return responseData.data.map(mapApiEventToAppEvent);
    } else {
      console.error("Suggestion API response did not match expected format:", responseData);
      return [];
    }
  } catch (error) {
    console.error(`Network error fetching suggestions for "${nameQuery}":`, error);
    return [];
  }
};
