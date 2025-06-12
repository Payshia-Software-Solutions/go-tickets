
import type { Event, Booking, User, Organizer, TicketType, ShowTime, ShowTimeTicketAvailability, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData } from './types';
import { parse } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";


// Helper to parse "YYYY-MM-DD HH:MM:SS" to ISO string or Date object
const parseApiDateString = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;
  try {
    // Assuming API date strings are in UTC or should be treated as such for parsing
    // then converted to ISO standard format.
    const parsedDate = parse(dateString, "yyyy-MM-dd HH:mm:ss", new Date());
    return parsedDate.toISOString();
  } catch (error) {
    console.warn(`Could not parse date string: ${dateString}`, error);
    return dateString; // Fallback to original string if parsing fails
  }
};

// Define interfaces for flat API responses to avoid 'any'
interface ApiShowTimeTicketAvailabilityFlat {
  id: string;
  ticketTypeId?: string; // If API provides it directly
  ticketType?: { id: string; name: string; price: number }; // If API provides nested
  availableCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiShowTimeFlat {
  id: string;
  dateTime: string;
  ticketAvailabilities?: ApiShowTimeTicketAvailabilityFlat[];
  createdAt?: string;
  updatedAt?: string;
}

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
  organizer?: Organizer; // Full organizer might come from detail endpoint
  ticketTypes?: TicketType[]; // Full ticket types might come from detail endpoint
  showTimes?: ApiShowTimeFlat[]; // Use the flat version here
  createdAt?: string;
  updatedAt?: string;
}

const mapApiEventToAppEvent = (apiEvent: ApiEventFlat): Event => {
  // This function maps the flat API event structure to our app's Event type.
  // It assumes the list endpoint might not provide full 'organizer', 'ticketTypes', 'showTimes'.
  // The detail endpoint should provide these.
  return {
    id: apiEvent.id,
    name: apiEvent.name,
    slug: apiEvent.slug,
    date: parseApiDateString(apiEvent.date) || new Date().toISOString(), // Ensure it's ISO
    location: apiEvent.location,
    description: apiEvent.description,
    category: apiEvent.category,
    imageUrl: apiEvent.imageUrl,
    venueName: apiEvent.venueName,
    venueAddress: apiEvent.venueAddress,
    organizerId: apiEvent.organizerId,
    organizer: apiEvent.organizer as Organizer,
    ticketTypes: apiEvent.ticketTypes as TicketType[],
    showTimes: apiEvent.showTimes?.map((st: ApiShowTimeFlat) => ({
      id: st.id,
      eventId: apiEvent.id,
      dateTime: parseApiDateString(st.dateTime) || new Date().toISOString(),
      createdAt: st.createdAt ? new Date(st.createdAt) : undefined,
      updatedAt: st.updatedAt ? new Date(st.updatedAt) : undefined,
      ticketAvailabilities: st.ticketAvailabilities?.map((sta: ApiShowTimeTicketAvailabilityFlat) => ({
        id: sta.id,
        showTimeId: st.id,
        ticketTypeId: sta.ticketType?.id || sta.ticketTypeId,
        ticketType: {
          id: sta.ticketType?.id || sta.ticketTypeId || 'unknown-tt-id',
          name: sta.ticketType?.name || 'N/A',
          price: sta.ticketType?.price || 0,
        },
        availableCount: sta.availableCount,
        createdAt: sta.createdAt ? new Date(sta.createdAt) : undefined,
        updatedAt: sta.updatedAt ? new Date(sta.updatedAt) : undefined,
      })) || [],
    })) || [],
    // venue: { // This was duplicated, ensure correct structure based on Event type
    //     name: apiEvent.venueName,
    //     address: apiEvent.venueAddress || null,
    // },
    // Assuming Event type has a single venue object like this from previous structure:
     venue: {
        name: apiEvent.venueName,
        address: apiEvent.venueAddress || null,
        // mapLink might need to be constructed or come from apiEvent if available
     },
    createdAt: apiEvent.createdAt ? new Date(apiEvent.createdAt) : undefined,
    updatedAt: apiEvent.updatedAt ? new Date(apiEvent.updatedAt) : undefined,
  };
};


// --- Event Fetching from API ---
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

// This function is now for the PUBLIC side, fetching category *names* or *objects*
// Based on the change request, it should now fetch Category objects
// It will fetch from an internal API route to avoid CORS issues.
export const fetchPublicEventCategoriesFromApi = async (): Promise<Category[]> => {
  try {
    const response = await fetch(INTERNAL_PUBLIC_CATEGORY_API_URL);
    if (!response.ok) {
      console.error("API Error fetching public categories from internal route:", response.status, await response.text());
      return [];
    }
    const categories: Category[] = await response.json();
    // Ensure IDs are strings if API returns numbers (though our internal route should handle this)
    return categories.map(cat => ({ ...cat, id: String(cat.id) }));
  } catch (error) {
    console.error("Network error fetching public categories from internal route:", INTERNAL_PUBLIC_CATEGORY_API_URL, error);
    console.warn("This might be due to a CORS issue with the external API, network connectivity problem, or the external API endpoint being temporarily unavailable (relayed through internal API).");
    return [];
  }
};

// --- Adapter functions using the new API fetchers ---
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
    .sort((a, b) => ((b.ticketTypes?.length || 0) + (b.showTimes?.length || 0)) - ((a.ticketTypes?.length || 0) + (a.showTimes?.length || 0)))
    .slice(0, limit);
};

// Updated to return Category[] objects
export const getEventCategories = async (): Promise<Category[]> => {
  return fetchPublicEventCategoriesFromApi();
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  const event = await fetchEventBySlugFromApi(slug);
  return event || undefined;
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (query) params.set('name_like', query);
  if (category) params.set('category', category);
  if (date) params.set('date_gte', date);
  if (location) params.set('location_like', location);
  // Price filters minPrice, maxPrice are not used in fetchEventsFromApi currently.
  return fetchEventsFromApi(params);
};


// In-memory data stores for entities NOT yet migrated to API or for specific mock scenarios
const mockUsers: User[] = [
  { id: 'user-1', email: 'admin@example.com', name: 'Admin User', isAdmin: true, billingAddress: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'user-2', email: 'customer@example.com', name: 'Regular Customer', isAdmin: false, billingAddress: null, createdAt: new Date(), updatedAt: new Date() },
];
let mockOrganizers: Organizer[] = [
  { id: 'org-1', name: 'Music Makers Inc.', contactEmail: 'contact@musicmakers.com', website: 'https://musicmakers.com', createdAt: new Date(), updatedAt: new Date() },
  { id: 'org-2', name: 'Tech Events Global', contactEmail: 'info@techevents.com', website: 'https://techevents.com', createdAt: new Date(), updatedAt: new Date() },
];
let mockEventsStore: Event[] = [];
const mockBookings: Booking[] = [];

// Helper for unique IDs
const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- Category Management (API based) ---
// These functions are used by the ADMIN API routes, so they call the EXTERNAL API directly (server-to-server).
export const adminGetAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(EXTERNAL_CATEGORY_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    const categories: Category[] = await response.json();
    return categories.map(cat => ({ ...cat, id: String(cat.id) })).sort((a, b) => a.name.localeCompare(b.name));
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
    return { ...category, id: String(category.id) };
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
    return { ...newCategory, id: String(newCategory.id) };
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
    return { ...updatedCategory, id: String(updatedCategory.id) };
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
       const errorBody = await response.json().catch(() => ({ message: 'Failed to delete category and parse error' }));
      // Check for specific message from API about category in use
      if (errorBody.message && errorBody.message.toLowerCase().includes("in use")) {
          throw new Error(`Cannot delete category: It is currently in use by one or more events.`);
      }
      throw new Error(errorBody.message || `Failed to delete category ${categoryId}: ${response.status}`);
    }
    return true; // Or response.status === 204 or check body for success message
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
};


// --- User Management (Mock - for admin/auth operations if not hitting API yet) ---
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return mockUsers.find(user => user.email === email) || null;
};

export const createUser = async (userData: { email: string, name?: string, isAdmin?: boolean }): Promise<User> => {
  if (mockUsers.some(u => u.email === userData.email)) {
    throw new Error("User with this email already exists.");
  }
  const newUser: User = {
    id: generateId('user'),
    email: userData.email,
    name: userData.name || '',
    isAdmin: userData.isAdmin || false,
    billingAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockUsers.push(newUser);
  return newUser;
};

export const updateUser = async (userId: string, dataToUpdate: Partial<User>): Promise<User | null> => {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  mockUsers[userIndex] = { ...mockUsers[userIndex], ...dataToUpdate, updatedAt: new Date() };
  if (typeof localStorage !== 'undefined') {
    const storedUser = localStorage.getItem('mypassUser');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.id === userId) {
        localStorage.setItem('mypassUser', JSON.stringify(mockUsers[userIndex]));
      }
    }
  }
  return mockUsers[userIndex];
};

// --- Organizer Management (Mock - for admin operations) ---
export const adminGetAllOrganizers = async (): Promise<Organizer[]> => {
  return [...mockOrganizers].sort((a,b) => a.name.localeCompare(b.name));
};

export const getOrganizerById = async (id: string): Promise<Organizer | null> => {
  return mockOrganizers.find(org => org.id === id) || null;
};

export const createOrganizer = async (data: OrganizerFormData): Promise<Organizer> => {
  const newOrganizer: Organizer = {
    id: generateId('org'),
    ...data,
    website: data.website || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockOrganizers.push(newOrganizer);
  return newOrganizer;
};

export const updateOrganizer = async (organizerId: string, data: OrganizerFormData): Promise<Organizer | null> => {
  const index = mockOrganizers.findIndex(org => org.id === organizerId);
  if (index === -1) return null;
  mockOrganizers[index] = {
    ...mockOrganizers[index],
    ...data,
    website: data.website || null,
    updatedAt: new Date(),
  };
  return mockOrganizers[index];
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  if (mockEventsStore.some(event => event.organizerId === organizerId)) {
    throw new Error(`Cannot delete organizer: Events are linked.`);
  }
  const initialLength = mockOrganizers.length;
  mockOrganizers = mockOrganizers.filter(org => org.id !== organizerId);
  return mockOrganizers.length < initialLength;
};


// --- Event Management (Mock - for admin operations) ---
export const adminGetAllEvents = async (): Promise<Event[]> => {
  // This function should fetch from your backend API that wraps the external event API
  // For now, using local mock if API_BASE_URL is not set, otherwise trying to fetch.
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, adminGetAllEvents using local mockEventsStore.");
    return [...mockEventsStore].sort((a,b) => (b.date && a.date) ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0);
  }
  try {
    const response = await fetch(`${API_BASE_URL}/events`); // Assuming your backend has an /events route
    if (!response.ok) {
      console.error("API Error fetching admin events:", response.status, await response.text());
      return []; // Fallback to empty or could return mockEventsStore
    }
    const apiEvents: ApiEventFlat[] = await response.json();
    return apiEvents.map(mapApiEventToAppEvent);
  } catch (error) {
    console.error("Network error fetching admin events:", error);
    return []; // Fallback
  }
};

export const getAdminEventById = async (id: string): Promise<Event | undefined> => {
  // This function should fetch from your backend API that wraps the external event API
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, getAdminEventById using local mockEventsStore.");
    return mockEventsStore.find(event => event.id === id);
  }
   try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`); // Assuming your backend has an /events/:id route
    if (!response.ok) {
      if (response.status === 404) return undefined;
      console.error(`API Error fetching admin event by id ${id}:`, response.status, await response.text());
      return undefined;
    }
    const apiEvent: ApiEventFlat = await response.json();
    return mapApiEventToAppEvent(apiEvent);
  } catch (error) {
    console.error(`Network error fetching admin event by id ${id}:`, error);
    return undefined;
  }
};


export const createEvent = async (data: EventFormData): Promise<Event> => {
  const organizer = await getOrganizerById(data.organizerId); // This still uses mockOrganizers
  if (!organizer) throw new Error("Organizer not found");

  const categoryName = data.category.trim();

  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`;
  
  // Assuming your backend API handles slug uniqueness if you post to it.
  // If this function is for direct client-side interaction with an external API (not recommended for create):
  // const existingEvents = await fetchEventsFromApi(); // Fetch all to check slug, very inefficient.
  // let finalSlug = baseSlug;
  // let counter = 1;
  // while (existingEvents.some(e => e.slug === finalSlug)) {
  //   finalSlug = `${baseSlug}-${counter}`;
  //   counter++;
  // }
  const finalSlug = baseSlug; // For mock, or rely on backend.

  const newEventId = generateId('evt');

  const ticketTypes: TicketType[] = data.ticketTypes.map(ttData => ({
    id: ttData.id && !ttData.id.startsWith('client-') ? ttData.id : generateId('tt'),
    eventId: newEventId,
    name: ttData.name,
    price: ttData.price,
    availability: ttData.availability,
    description: ttData.description || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const showTimes: ShowTime[] = data.showTimes.map(stData => {
    const showTimeId = stData.id && !stData.id.startsWith('client-') ? stData.id : generateId('st');
    return {
      id: showTimeId,
      eventId: newEventId,
      dateTime: stData.dateTime.toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
        const parentTicketType = ticketTypes.find(tt => tt.id === staData.ticketTypeId);
        if (!parentTicketType) throw new Error(`Ticket type template with ID ${staData.ticketTypeId} not found for showtime.`);
        return {
          id: staData.id && !staData.id.startsWith('client-') ? staData.id : generateId('sta'),
          showTimeId: showTimeId,
          ticketTypeId: parentTicketType.id,
          ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
          availableCount: staData.availableCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    };
  });
  
  const eventPayloadForApi = { // This structure should match what your backend API expects for event creation
    name: data.name,
    slug: finalSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: categoryName,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    venueName: data.venueName,
    venueAddress: data.venueAddress || null,
    ticketTypes: data.ticketTypes.map(tt => ({name: tt.name, price: tt.price, availability: tt.availability, description: tt.description})), // simplified for API
    showTimes: data.showTimes.map(st => ({
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        ticketTypeName: sta.ticketTypeName, // API might need name or ID to link
        // ticketTypeId: find_ticket_type_id_from_name_if_needed()
        availableCount: sta.availableCount
      }))
    }))
  };


  // If API_BASE_URL is set, assume we are posting to a backend API
  if (API_BASE_URL) {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayloadForApi),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to create event via API and parse error' }));
      throw new Error(errorBody.message || `API error creating event: ${response.status}`);
    }
    const createdApiEvent: ApiEventFlat = await response.json();
    return mapApiEventToAppEvent(createdApiEvent);
  } else {
    // Fallback to local mock store manipulation
    console.warn("API_BASE_URL not set, createEvent using local mockEventsStore.");
    const newEvent: Event = {
      id: newEventId,
      name: data.name,
      slug: finalSlug,
      date: data.date.toISOString(),
      location: data.location,
      description: data.description,
      category: categoryName,
      imageUrl: data.imageUrl,
      organizerId: data.organizerId,
      organizer: organizer,
      venue: {
          name: data.venueName,
          address: data.venueAddress || null,
      },
      ticketTypes,
      showTimes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockEventsStore.push(newEvent);
    return newEvent;
  }
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const organizer = await getOrganizerById(data.organizerId); // Still mock
  if (!organizer) throw new Error("Organizer not found");

  const categoryName = data.category.trim();
  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

   const eventPayloadForApi = { // Similar to createEvent payload
    name: data.name,
    slug: finalNewSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: categoryName,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    venueName: data.venueName,
    venueAddress: data.venueAddress || null,
    ticketTypes: data.ticketTypes, // API needs to handle IDs for updates/creates
    showTimes: data.showTimes.map(st => ({
      id: st.id?.startsWith('client-') ? undefined : st.id, // Pass ID if exists
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        id: sta.id?.startsWith('client-') ? undefined : sta.id, // Pass ID if exists
        ticketTypeId: sta.ticketTypeId, // API needs to know which TT this availability belongs to
        ticketTypeName: sta.ticketTypeName,
        availableCount: sta.availableCount,
      }))
    }))
  };

  if (API_BASE_URL) {
     const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayloadForApi),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to update event via API and parse error' }));
      throw new Error(errorBody.message || `API error updating event ${eventId}: ${response.status}`);
    }
    const updatedApiEvent: ApiEventFlat = await response.json();
    return mapApiEventToAppEvent(updatedApiEvent);
  } else {
    console.warn(`API_BASE_URL not set, updateEvent using local mockEventsStore for event ID: ${eventId}.`);
    const eventIndex = mockEventsStore.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return undefined;
    const originalEvent = mockEventsStore[eventIndex];

    if (finalNewSlug !== originalEvent.slug && mockEventsStore.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
      throw new Error("Slug already exists in mock store");
    }

    const updatedTicketTypes: TicketType[] = data.ticketTypes.map(ttData => {
      const existingTt = originalEvent.ticketTypes?.find(ett => ett.id === ttData.id);
      return {
        id: existingTt?.id || generateId('tt'), eventId, name: ttData.name, price: ttData.price,
        availability: ttData.availability, description: ttData.description || null,
        createdAt: existingTt?.createdAt || new Date(), updatedAt: new Date(),
      };
    });

    const updatedShowTimes: ShowTime[] = data.showTimes.map(stData => {
      const existingSt = originalEvent.showTimes?.find(est => est.id === stData.id);
      const showTimeId = existingSt?.id || generateId('st');
      return {
        id: showTimeId, eventId, dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
          const parentTicketType = updatedTicketTypes.find(tt => tt.id === staData.ticketTypeId);
          if (!parentTicketType) throw new Error(`Ticket type template ${staData.ticketTypeId} not found.`);
          const existingSta = existingSt?.ticketAvailabilities.find(esta => esta.ticketType.id === parentTicketType.id);
          return {
            id: existingSta?.id || generateId('sta'), showTimeId, ticketTypeId: parentTicketType.id,
            ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
            availableCount: staData.availableCount,
            createdAt: existingSta?.createdAt || new Date(), updatedAt: new Date(),
          };
        }),
        createdAt: existingSt?.createdAt || new Date(), updatedAt: new Date(),
      };
    });
    
    mockEventsStore[eventIndex] = {
      ...originalEvent, name: data.name, slug: finalNewSlug, date: data.date.toISOString(),
      location: data.location, description: data.description, category: categoryName,
      imageUrl: data.imageUrl, organizerId: data.organizerId, organizer: organizer,
      venue: { name: data.venueName, address: data.venueAddress || null },
      ticketTypes: updatedTicketTypes, showTimes: updatedShowTimes, updatedAt: new Date(),
    };
    return mockEventsStore[eventIndex];
  }
};


export const deleteEvent = async (eventId: string): Promise<boolean> => {
    // Check mock bookings first if those are still relevant for deletion logic
    if (mockBookings.some(booking => booking.eventId === eventId)) {
      throw new Error(`Cannot delete event: Bookings are associated. Please manage bookings first.`);
    }
    
    if (API_BASE_URL) {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: 'Failed to delete event via API and parse error' }));
            throw new Error(errorBody.message || `API error deleting event ${eventId}: ${response.status}`);
        }
        return response.ok; // Or check status 200/204
    } else {
        console.warn(`API_BASE_URL not set, deleteEvent using local mockEventsStore for event ID: ${eventId}.`);
        const initialLength = mockEventsStore.length;
        mockEventsStore = mockEventsStore.filter(event => event.id !== eventId);
        return mockEventsStore.length < initialLength;
    }
};

// --- Payment Simulation (Mock) ---
export const processMockPayment = async (
  details: {
    amount: number;
    billingAddress: BillingAddress;
  }
): Promise<{ success: boolean; transactionId?: string; message?: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (details.amount > 0) {
        resolve({
          success: true,
          transactionId: `txn_${generateId('pay')}`,
          message: "Payment successful."
        });
      } else {
        resolve({
          success: false,
          message: "Payment failed (mock: amount was zero or invalid)."
        });
      }
    }, 1500);
  });
};


// --- Booking Management (Mock) ---
export const createBooking = async (
  bookingData: {
    eventId: string;
    userId: string;
    tickets: BookedTicketItem[];
    totalPrice: number;
    billingAddress: BillingAddress;
  }
): Promise<Booking> => {
  const user = mockUsers.find(u => u.id === bookingData.userId);
  if (!user) throw new Error("User not found for booking.");

  const event = API_BASE_URL 
    ? await fetchEventBySlugFromApi(bookingData.tickets[0]?.eventNsid) // Assuming eventNsid is slug
    : mockEventsStore.find(e => e.id === bookingData.eventId);
    
  if (!event || !event.showTimes) throw new Error("Event or its showtimes not found for booking.");

  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");

  // Need to find the showTime and update its availability *in the source of truth*
  // If using API_BASE_URL, this implies an API call to update availability, which is complex for this mock.
  // For simplicity, if API_BASE_URL is set, we will *not* update availability in this mock function.
  // If not using API_BASE_URL, update local mockEventsStore.
  if (!API_BASE_URL) {
      const eventInStoreIndex = mockEventsStore.findIndex(e => e.id === event.id);
      if (eventInStoreIndex === -1) throw new Error("Event not found in mock store for availability update.");
      
      const showTimeIndex = mockEventsStore[eventInStoreIndex].showTimes.findIndex(st => st.id === showTimeId);
      if (showTimeIndex === -1) throw new Error(`ShowTime with ID ${showTimeId} not found for this event in mock store.`);
      
      const showTimeToUpdate = mockEventsStore[eventInStoreIndex].showTimes[showTimeIndex];

      for (const ticketItem of bookingData.tickets) {
        if (ticketItem.showTimeId !== showTimeId) {
            throw new Error("All tickets in a single booking must be for the same showtime.");
        }
        const staIndex = showTimeToUpdate.ticketAvailabilities.findIndex(sta => sta.ticketType.id === ticketItem.ticketTypeId);
        if (staIndex === -1) {
          throw new Error(`Availability record not found for ticket type ${ticketItem.ticketTypeName} in mock store.`);
        }
        if (showTimeToUpdate.ticketAvailabilities[staIndex].availableCount < ticketItem.quantity) {
          throw new Error(`Not enough tickets available for ${ticketItem.ticketTypeName} in mock store.`);
        }
        mockEventsStore[eventInStoreIndex].showTimes[showTimeIndex].ticketAvailabilities[staIndex].availableCount -= ticketItem.quantity;
      }
  } else {
      console.warn("API_BASE_URL is set. Mock createBooking will not update ticket availability on the remote server via this function. This should be handled by a dedicated API call or backend logic.")
  }


  const bookingId = generateId('bk');
  const newBooking: Booking = {
    id: bookingId,
    eventId: bookingData.eventId,
    userId: bookingData.userId,
    bookedTickets: bookingData.tickets.map(ticket => ({
      id: generateId('btk'),
      bookingId: bookingId,
      eventNsid: event.slug,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketTypeName,
      quantity: ticket.quantity,
      pricePerTicket: ticket.pricePerTicket,
      showTimeId: ticket.showTimeId,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    totalPrice: bookingData.totalPrice,
    billingAddress: bookingData.billingAddress,
    bookingDate: new Date().toISOString(),
    eventName: event.name,
    // Find the specific showtime dateTime from the full event object fetched/found
    eventDate: event.showTimes.find(st => st.id === showTimeId)?.dateTime || new Date().toISOString(), 
    eventLocation: event.location,
    qrCodeValue: `EVENT:${event.slug},BOOKING_ID:${bookingId},SHOWTIME:${event.showTimes.find(st => st.id === showTimeId)?.dateTime}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockBookings.push(newBooking);
  return newBooking;
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  return mockBookings.find(booking => booking.id === id);
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  return [...mockBookings].sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
};


const initAdminMockData = async () => {
    if (mockEventsStore.length > 0 && mockEventsStore.some(e => e.id === 'evt-predefined-1-admin')) return;
    if (API_BASE_URL) {
        console.log("API_BASE_URL is set, skipping local mock data initialization for admin events as it might conflict with API.");
        return;
    }

    const org1 = mockOrganizers.find(o => o.id === 'org-1') || mockOrganizers[0];

    const defaultEventDataList: EventFormData[] = [
        {
            name: "Admin Mock Music Fest 2025",
            slug: "admin-summer-music-fest-2025",
            date: new Date(new Date().getFullYear() + 1, 5, 15),
            location: "Grand Park, Downtown",
            description: "<p>Admin-managed music festival.</p>",
            category: "Festivals", 
            imageUrl: "https://placehold.co/800x450.png",
            organizerId: org1.id,
            venueName: "Grand Park Main Stage",
            venueAddress: "123 Park Ave, Downtown",
            ticketTypes: [
                { id: generateId('tt'), name: "General Admission", price: 75, availability: 500, description: "Access to all stages." },
                { id: generateId('tt'), name: "VIP Pass", price: 250, availability: 100, description: "VIP lounge, front stage access, free merch." }
            ],
            showTimes: [
                { id: generateId('st'), dateTime: new Date(new Date().getFullYear() + 1, 5, 15, 18, 0),
                  ticketAvailabilities: [
                    { ticketTypeId: "NEEDS_REPLACEMENT_GA_ADMIN", ticketTypeName: "General Admission", availableCount: 200 },
                    { ticketTypeId: "NEEDS_REPLACEMENT_VIP_ADMIN", ticketTypeName: "VIP Pass", availableCount: 50 }
                  ]
                }
            ]
        }
    ];

    for (const eventData of defaultEventDataList) {
        const finalTicketTypes = eventData.ticketTypes;
        const finalShowTimes = eventData.showTimes.map(st => {
            const newTicketAvailabilities = st.ticketAvailabilities.map(sta => {
                const parentTicketType = finalTicketTypes.find(tt => tt.name === sta.ticketTypeName);
                if (!parentTicketType || !parentTicketType.id) {
                    console.error(`Error in mock data: Could not find parent ticket type for ${sta.ticketTypeName}`);
                    return { ...sta, ticketTypeId: 'error-tt-id' };
                }
                return { ...sta, ticketTypeId: parentTicketType.id };
            });
            return { ...st, ticketAvailabilities: newTicketAvailabilities };
        });

        const createdEvent = await createEvent({ ...eventData, ticketTypes: finalTicketTypes, showTimes: finalShowTimes });
        if(eventData.name.includes("Admin Mock Music Fest")) createdEvent.id = 'evt-predefined-1-admin';
    }
};

initAdminMockData();

