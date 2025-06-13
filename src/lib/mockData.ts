
import type { Event, Booking, User, Organizer, TicketType, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData } from './types';
import { parse, isValid } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
const BOOKINGS_API_URL = "https://gotickets-server.payshia.com/bookings";
const ORGANIZERS_API_URL = "https://gotickets-server.payshia.com/organizers";
// const SHOWTIMES_API_URL = "https://gotickets-server.payshia.com/showtimes"; // Not directly used for now
// const AVAILABILITY_API_URL = "https://gotickets-server.payshia.com/availability"; // Info used for mapping structure


// Helper to parse various date strings to ISO string
const parseApiDateString = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;

  const tryParseVariousFormats = (dateStr: string): Date | null => {
    // Common formats the API might send, ordered by specificity or likelihood
    const formatsToTry = [
      "yyyy-MM-dd HH:mm:ss.SSS", // With milliseconds, space separator
      "yyyy-MM-dd HH:mm:ss",     // Without milliseconds, space separator
      "yyyy-MM-dd'T'HH:mm:ss.SSSX", // ISO 8601 with Z or offset, milliseconds
      "yyyy-MM-dd'T'HH:mm:ssX",    // ISO 8601 with Z or offset, no milliseconds
      "yyyy-MM-dd'T'HH:mm:ss.SSS", // ISO 8601 without Z/offset, milliseconds
      "yyyy-MM-dd'T'HH:mm:ss",    // ISO 8601 without Z/offset, no milliseconds
      "yyyy-MM-dd", // Date only
    ];

    for (const fmt of formatsToTry) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (e) {
        // Ignore parse errors for specific format, try next
      }
    }
    // Fallback to direct Date constructor for other ISO-like or common formats
    try {
      const nativeParsed = new Date(dateStr);
      if (isValid(nativeParsed)) {
        return nativeParsed;
      }
    } catch(e) {
        // Ignore native Date constructor error
    }
    return null;
  };

  const parsedDateObject = tryParseVariousFormats(dateString);

  if (parsedDateObject) {
    return parsedDateObject.toISOString();
  }
  
  console.warn(`Could not parse date string: "${dateString}" into a valid ISO string. Returning original or undefined.`);
  return dateString; 
};

// Define interfaces for flat API responses to avoid 'any'
interface ApiShowTimeTicketAvailabilityFlat {
  id: string;
  showTimeId?: string; // Added based on sample from /availability
  ticketTypeId?: string;
  ticketType?: { id: string; name: string; price: number }; // If API nests this directly
  availableCount: number | string; // Can be string from API
  createdAt?: string;
  updatedAt?: string;
}

interface ApiShowTimeFlat {
  id: string;
  eventId?: string; // Added based on sample from /showtimes
  dateTime: string;
  ticketAvailabilities?: ApiShowTimeTicketAvailabilityFlat[];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiTicketTypeFlat {
    id: string;
    eventId?: string;
    name: string;
    price: number;
    availability: number;
    description?: string | null;
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
  organizer?: Organizer; // Assumes Organizer type is used directly if API nests it
  ticketTypes?: ApiTicketTypeFlat[];
  showTimes?: ApiShowTimeFlat[];
  createdAt?: string;
  updatedAt?: string;
}

const mapApiEventToAppEvent = (apiEvent: ApiEventFlat): Event => {
  const masterTicketTypes: TicketType[] = (apiEvent.ticketTypes || []).map((tt: ApiTicketTypeFlat) => ({
    id: tt.id,
    eventId: tt.eventId,
    name: tt.name,
    price: tt.price,
    availability: tt.availability,
    description: tt.description,
    createdAt: parseApiDateString(tt.createdAt),
    updatedAt: parseApiDateString(tt.updatedAt),
  }));

  return {
    id: apiEvent.id,
    name: apiEvent.name,
    slug: apiEvent.slug,
    date: parseApiDateString(apiEvent.date) || new Date().toISOString(),
    location: apiEvent.location,
    description: apiEvent.description,
    category: apiEvent.category,
    imageUrl: apiEvent.imageUrl,
    venueName: apiEvent.venueName,
    venueAddress: apiEvent.venueAddress,
    organizerId: apiEvent.organizerId,
    organizer: apiEvent.organizer ? {
        ...apiEvent.organizer,
        createdAt: parseApiDateString(apiEvent.organizer.createdAt),
        updatedAt: parseApiDateString(apiEvent.organizer.updatedAt),
    } : undefined,
    ticketTypes: masterTicketTypes,
    showTimes: (apiEvent.showTimes || []).map((st: ApiShowTimeFlat) => ({
      id: st.id,
      eventId: st.eventId || apiEvent.id, // Prefer eventId from showtime itself, fallback to parent event's ID
      dateTime: parseApiDateString(st.dateTime) || new Date().toISOString(),
      createdAt: parseApiDateString(st.createdAt),
      updatedAt: parseApiDateString(st.updatedAt),
      ticketAvailabilities: (st.ticketAvailabilities || []).map((sta: ApiShowTimeTicketAvailabilityFlat) => {
        let ticketTypeDetails: Pick<TicketType, 'id' | 'name' | 'price'>;
        
        if (sta.ticketType && sta.ticketType.id && sta.ticketType.name && typeof sta.ticketType.price === 'number') {
          // If API nests full ticketType object within availability
          ticketTypeDetails = {
            id: sta.ticketType.id,
            name: sta.ticketType.name,
            price: sta.ticketType.price,
          };
        } else if (sta.ticketTypeId) {
          // If only ticketTypeId is provided, find it in the master list for this event
          const foundMasterType = masterTicketTypes.find(mtt => mtt.id === sta.ticketTypeId);
          if (foundMasterType) {
            ticketTypeDetails = {
              id: foundMasterType.id,
              name: foundMasterType.name,
              price: foundMasterType.price,
            };
          } else {
            console.warn(`mapApiEventToAppEvent: Master TicketType with ID ${sta.ticketTypeId} not found for showtime ${st.id}.`);
            ticketTypeDetails = { id: sta.ticketTypeId, name: 'Unknown Ticket Type', price: 0 };
          }
        } else {
          console.warn(`mapApiEventToAppEvent: TicketType ID missing for an availability record in showtime ${st.id}.`);
          ticketTypeDetails = { id: 'unknown-tt-id', name: 'Unknown Ticket Type', price: 0 };
        }
        
        return {
          id: sta.id,
          showTimeId: sta.showTimeId || st.id, // Prefer showTimeId from availability itself, fallback to parent showtime's ID
          ticketTypeId: ticketTypeDetails.id, // Use the resolved/found ticket type ID
          ticketType: ticketTypeDetails,
          availableCount: parseInt(String(sta.availableCount), 10) || 0, // Parse string to number
          createdAt: parseApiDateString(sta.createdAt),
          updatedAt: parseApiDateString(sta.updatedAt),
        };
      }),
    })),
    mapLink: `https://maps.google.com/?q=${encodeURIComponent(apiEvent.venueAddress || apiEvent.location)}`,
    createdAt: parseApiDateString(apiEvent.createdAt),
    updatedAt: parseApiDateString(apiEvent.updatedAt),
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

export const fetchPublicEventCategoriesFromApi = async (): Promise<Category[]> => {
  try {
    // console.log(`Attempting to fetch public categories from: ${INTERNAL_PUBLIC_CATEGORY_API_URL}`);
    const response = await fetch(INTERNAL_PUBLIC_CATEGORY_API_URL);
    if (!response.ok) {
      const errorBodyText = await response.text();
      console.error(`API Error fetching public categories from internal route (${INTERNAL_PUBLIC_CATEGORY_API_URL}): ${response.status} - ${errorBodyText}`);
      return [];
    }
    const categories: Category[] = await response.json();
    return categories.map(cat => ({
        ...cat,
        id: String(cat.id), // Ensure ID is string
        createdAt: parseApiDateString(cat.createdAt),
        updatedAt: parseApiDateString(cat.updatedAt)
    }));
  } catch (error) {
    console.error(`Network error fetching public categories from internal route: ${INTERNAL_PUBLIC_CATEGORY_API_URL}`, error);
    // console.warn("This might be due to a CORS issue with the external API, network connectivity problem, or the external API endpoint being temporarily unavailable (relayed through internal API).");
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

export const getEventCategories = async (): Promise<Category[]> => {
  return fetchPublicEventCategoriesFromApi();
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  const event = await fetchEventBySlugFromApi(slug);
  return event || undefined;
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (query) params.set('name_like', query); // Assuming API supports _like for partial matching
  if (category) params.set('category', category);
  if (date) params.set('date_gte', date); // Assuming API supports _gte for date range start
  if (location) params.set('location_like', location); // Assuming API supports _like
  return fetchEventsFromApi(params);
};


// In-memory data stores for entities NOT yet migrated to API or for specific mock scenarios
const mockUsers: User[] = [
  { id: 'user-1', email: 'admin@example.com', name: 'Admin User', isAdmin: true, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'user-2', email: 'customer@example.com', name: 'Regular Customer', isAdmin: false, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
let mockEventsStore: Event[] = []; // Used if API_BASE_URL is not set for events

// Helper for unique IDs
const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- Category Management (API based) ---
export const adminGetAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(EXTERNAL_CATEGORY_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    const categories: Category[] = await response.json();
    return categories.map(cat => ({
        ...cat,
        id: String(cat.id), // Ensure ID is string
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
        id: String(category.id), // Ensure ID is string
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
        id: String(newCategory.id), // Ensure ID is string
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
        id: String(updatedCategory.id), // Ensure ID is string
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
       const errorBody = await response.json().catch(() => ({ message: 'Failed to delete category and parse error' }));
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


// --- User Management (Mock - for admin/auth operations if not hitting API yet) ---
export const getUserByEmail = async (email: string): Promise<User | null> => {
  // This should ideally hit an API in a real app
  return mockUsers.find(user => user.email === email) || null;
};

export const createUser = async (userData: { email: string, name?: string, isAdmin?: boolean }): Promise<User> => {
  // This should ideally hit an API in a real app
  if (mockUsers.some(u => u.email === userData.email)) {
    throw new Error("User with this email already exists.");
  }
  const newUser: User = {
    id: generateId('user'),
    email: userData.email,
    name: userData.name || '',
    isAdmin: userData.isAdmin || false,
    billingAddress: null, // Default billing address
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockUsers.push(newUser);
  return newUser;
};

export const updateUser = async (userId: string, dataToUpdate: Partial<User>): Promise<User | null> => {
  // This should ideally hit an API in a real app
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  mockUsers[userIndex] = { ...mockUsers[userIndex], ...dataToUpdate, updatedAt: new Date().toISOString() };
  // If using localStorage for session, update it too
  if (typeof localStorage !== 'undefined') {
    const storedUser = localStorage.getItem('mypassUser'); // Assuming 'mypassUser' is your key
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.id === userId) {
        localStorage.setItem('mypassUser', JSON.stringify(mockUsers[userIndex]));
      }
    }
  }
  return mockUsers[userIndex];
};

// --- Organizer Management (API Based) ---
const mapApiOrganizerToAppOrganizer = (apiOrganizer: any): Organizer => {
  return {
    id: String(apiOrganizer.id), // Ensure ID is string
    name: apiOrganizer.name,
    contactEmail: apiOrganizer.contactEmail,
    website: apiOrganizer.website || null,
    createdAt: parseApiDateString(apiOrganizer.createdAt),
    updatedAt: parseApiDateString(apiOrganizer.updatedAt),
  };
};

export const adminGetAllOrganizers = async (): Promise<Organizer[]> => {
  // console.log(`Fetching all organizers from: ${ORGANIZERS_API_URL}`);
  try {
    const response = await fetch(ORGANIZERS_API_URL);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to fetch organizers and parse error response.' }));
      console.error("API Error fetching organizers:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to fetch organizers: ${response.status}`);
    }
    const responseData = await response.json();
    const apiOrganizers: any[] = Array.isArray(responseData) ? responseData : responseData.data || responseData.organizers || [];

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
  // console.log(`Fetching organizer by ID: ${id} from: ${ORGANIZERS_API_URL}/${id}`);
  try {
    const response = await fetch(`${ORGANIZERS_API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      const errorBody = await response.json().catch(() => ({ message: `Failed to fetch organizer ${id} and parse error response.` }));
      console.error("API Error fetching organizer by ID:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to fetch organizer ${id}: ${response.status}`);
    }
    const apiOrganizer = await response.json();
    return mapApiOrganizerToAppOrganizer(apiOrganizer);
  } catch (error) {
    console.error(`Network or other error fetching organizer ${id}:`, error);
    return null;
  }
};

export const createOrganizer = async (data: OrganizerFormData): Promise<Organizer> => {
  // console.log(`Creating organizer via API: ${ORGANIZERS_API_URL}`);
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
    const newApiOrganizer = await response.json();
    return mapApiOrganizerToAppOrganizer(newApiOrganizer);
  } catch (error) {
    console.error("Network or other error creating organizer:", error);
    throw error;
  }
};

export const updateOrganizer = async (organizerId: string, data: OrganizerFormData): Promise<Organizer | null> => {
  // console.log(`Updating organizer ID: ${organizerId} via API: ${ORGANIZERS_API_URL}/${organizerId}`);
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
    const updatedApiOrganizer = await response.json();
    return mapApiOrganizerToAppOrganizer(updatedApiOrganizer);
  } catch (error) {
    console.error(`Network or other error updating organizer ${organizerId}:`, error);
    throw error;
  }
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  // console.log(`Deleting organizer ID: ${organizerId} via API: ${ORGANIZERS_API_URL}/${organizerId}`);
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
    return response.ok; // Or response.ok which should be true here
  } catch (error) {
    console.error(`Network or other error deleting organizer ${organizerId}:`, error);
    throw error;
  }
};


// --- Event Management (Mock - for admin operations if API_BASE_URL is not set for events) ---
export const adminGetAllEvents = async (): Promise<Event[]> => {
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, adminGetAllEvents using local mockEventsStore.");
    return [...mockEventsStore].sort((a,b) => (b.date && a.date) ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0);
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
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, getAdminEventById using local mockEventsStore.");
    return mockEventsStore.find(event => event.id === id);
  }
   try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
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
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  const categoryName = data.category.trim();
  // Generate slug if not provided or ensure it's valid
  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`; // Fallback slug
  const finalSlug = baseSlug; // Potentially add uniqueness check here against API if needed

  const newEventId = generateId('evt'); // Client-side temp ID if API doesn't return one immediately or for local mock

  // Prepare ticket types from form data
  const ticketTypes: TicketType[] = data.ticketTypes.map(ttData => ({
    id: ttData.id && !ttData.id.startsWith('client-') ? ttData.id : generateId('tt'), // Use existing DB ID or generate client temp
    eventId: newEventId, // Link to the new event
    name: ttData.name,
    price: ttData.price,
    availability: ttData.availability, // This is the template/default availability
    description: ttData.description || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Prepare show times from form data
  const showTimes: ShowTime[] = data.showTimes.map(stData => {
    const showTimeId = stData.id && !stData.id.startsWith('client-') ? stData.id : generateId('st'); // Use existing DB ID or generate client temp
    return {
      id: showTimeId,
      eventId: newEventId, // Link to the new event
      dateTime: stData.dateTime.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
        // Find the corresponding TicketType template to get its ID and details
        const parentTicketType = ticketTypes.find(tt => tt.id === staData.ticketTypeId || tt.name === staData.ticketTypeName);
        if (!parentTicketType) {
          // This should ideally not happen if form logic is correct
          console.error(`Ticket type template for "${staData.ticketTypeName}" (ID: ${staData.ticketTypeId}) not found.`);
          throw new Error(`Ticket type template for "${staData.ticketTypeName}" not found for showtime.`);
        }
        return {
          id: staData.id && !staData.id.startsWith('client-') ? staData.id : generateId('sta'), // Use existing DB ID or generate client temp
          showTimeId: showTimeId, // Link to this showtime
          ticketTypeId: parentTicketType.id, // ID from the TicketType template
          ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price }, // Denormalized info
          availableCount: staData.availableCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
    };
  });

  // Payload for the API
  const eventPayloadForApi = {
    name: data.name,
    slug: finalSlug,
    date: data.date.toISOString(), // Main event date
    location: data.location,
    description: data.description,
    category: categoryName, // Category name string
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    venueName: data.venueName,
    venueAddress: data.venueAddress || null,
    // API might expect ticketTypes and showTimes in a specific format
    // For ticketTypes, it's often just the definitions (name, price, default availability, desc)
    ticketTypes: data.ticketTypes.map(tt => ({name: tt.name, price: tt.price, availability: tt.availability, description: tt.description})),
    // For showTimes, it's the dateTime and the specific availabilities for that showtime
    showTimes: data.showTimes.map(st => ({
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        // Assuming API links by ticketTypeName or needs a new TicketType created if not matched by ID
        ticketTypeName: sta.ticketTypeName, // Or ticketTypeId if API expects that link
        availableCount: sta.availableCount
      }))
    }))
  };

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
    return mapApiEventToAppEvent(createdApiEvent); // Map the API response back to app structure
  } else {
    // Fallback to local mock store if API_BASE_URL is not set
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
      organizer: organizer, // Attach the fetched organizer object
      venueName: data.venueName,
      venueAddress: data.venueAddress || null,
      ticketTypes, // Use the processed ticketTypes array
      showTimes,   // Use the processed showTimes array
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockEventsStore.push(newEvent);
    return newEvent;
  }
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  // Fetch organizer details (could be optimized if organizer rarely changes)
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  const categoryName = data.category.trim();
  const finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  // Structure the payload for the API
   const eventPayloadForApi = {
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
    ticketTypes: data.ticketTypes, // Send full TicketTypeFormData array
    showTimes: data.showTimes.map(st => ({
      id: st.id?.startsWith('client-') ? undefined : st.id, // Remove client-temp IDs for new STs
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        id: sta.id?.startsWith('client-') ? undefined : sta.id, // Remove client-temp IDs for new STAs
        ticketTypeId: sta.ticketTypeId, // This should be the ID of the TicketType template
        ticketTypeName: sta.ticketTypeName, // For reference or if API uses it
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
    // Fallback to local mock store for update
    console.warn(`API_BASE_URL not set, updateEvent using local mockEventsStore for event ID: ${eventId}.`);
    const eventIndex = mockEventsStore.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return undefined; // Event not found in mock store

    const originalEvent = mockEventsStore[eventIndex];

    // Basic slug uniqueness check for mock store (API should handle this ideally)
    if (finalNewSlug !== originalEvent.slug && mockEventsStore.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
      throw new Error("Slug already exists in mock store");
    }

    // Process ticket types and showtimes similarly to createEvent for mock store
    const updatedTicketTypes: TicketType[] = data.ticketTypes.map(ttData => {
      const existingTt = originalEvent.ticketTypes?.find(ett => ett.id === ttData.id);
      return {
        id: existingTt?.id || generateId('tt'), // Keep existing ID or generate new for mock
        eventId,
        name: ttData.name,
        price: ttData.price,
        availability: ttData.availability,
        description: ttData.description || null,
        createdAt: existingTt?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const updatedShowTimes: ShowTime[] = data.showTimes.map(stData => {
      const existingSt = originalEvent.showTimes?.find(est => est.id === stData.id);
      const showTimeId = existingSt?.id || generateId('st'); // Keep existing ID or generate new
      return {
        id: showTimeId,
        eventId,
        dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
          const parentTicketType = updatedTicketTypes.find(tt => tt.id === staData.ticketTypeId);
          if (!parentTicketType) throw new Error(`Ticket type template ${staData.ticketTypeId} not found.`);
          const existingSta = existingSt?.ticketAvailabilities.find(esta => esta.ticketType.id === parentTicketType.id);
          return {
            id: existingSta?.id || generateId('sta'),
            showTimeId,
            ticketTypeId: parentTicketType.id,
            ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
            availableCount: staData.availableCount,
            createdAt: existingSta?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }),
        createdAt: existingSt?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    mockEventsStore[eventIndex] = {
      ...originalEvent,
      name: data.name,
      slug: finalNewSlug,
      date: data.date.toISOString(),
      location: data.location,
      description: data.description,
      category: categoryName,
      imageUrl: data.imageUrl,
      organizerId: data.organizerId,
      organizer: organizer, // Attach updated organizer object
      venueName: data.venueName,
      venueAddress: data.venueAddress || null,
      ticketTypes: updatedTicketTypes,
      showTimes: updatedShowTimes,
      updatedAt: new Date().toISOString(),
    };
    return mockEventsStore[eventIndex];
  }
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
        // Fallback to local mock store
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
    // cardDetails: any; // Could be more specific if using a real payment gateway
    billingAddress: BillingAddress;
  }
): Promise<{ success: boolean; transactionId?: string; message?: string }> => {
  // Simulate API call
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
    }, 1500); // Simulate network delay
  });
};


// --- Booking Management (API based) ---

// Transformer function
export const transformApiBookingToAppBooking = (apiBooking: any): Booking => {
  let parsedBillingAddress: BillingAddress;
  if (typeof apiBooking.billing_address === 'string') {
    try {
      parsedBillingAddress = JSON.parse(apiBooking.billing_address);
    } catch (e) {
      console.error("Failed to parse billing_address string:", e, "Raw:", apiBooking.billing_address);
      // Fallback to a default/empty structure if parsing fails
      parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" };
    }
  } else if (typeof apiBooking.billing_address === 'object' && apiBooking.billing_address !== null) {
    parsedBillingAddress = apiBooking.billing_address;
  } else {
    parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" };
  }

  // Handle totalPrice
  const rawTotalPrice = apiBooking.total_price ?? apiBooking.totalPrice; // Check both snake_case and camelCase
  let parsedPrice = parseFloat(String(rawTotalPrice));
  if (!Number.isFinite(parsedPrice)) {
      console.warn(`Invalid totalPrice value received: ${rawTotalPrice}. Defaulting to 0.`);
      parsedPrice = 0;
  }
  
  return {
    id: String(apiBooking.id),
    eventId: String(apiBooking.event_id || apiBooking.eventId),
    userId: String(apiBooking.user_id || apiBooking.userId),
    bookingDate: parseApiDateString(apiBooking.booking_date || apiBooking.bookingDate) || new Date().toISOString(),
    eventDate: parseApiDateString(apiBooking.event_date || apiBooking.eventDate) || new Date().toISOString(),
    eventName: apiBooking.event_name || apiBooking.eventName || "N/A",
    eventLocation: apiBooking.event_location || apiBooking.eventLocation || "N/A",
    qrCodeValue: apiBooking.qr_code_value || apiBooking.qrCodeValue || `BOOKING:${apiBooking.id}`, // Fallback QR
    totalPrice: parsedPrice,
    billingAddress: parsedBillingAddress,
    bookedTickets: (apiBooking.booked_tickets || apiBooking.bookedTickets || []).map((bt: any) => ({
      id: String(bt.id),
      bookingId: String(bt.booking_id || bt.bookingId || apiBooking.id), // Use parent booking ID if nested one is missing
      ticketTypeId: String(bt.ticket_type_id || bt.ticketTypeId),
      ticketTypeName: bt.ticket_type_name || bt.ticketTypeName || "N/A",
      showTimeId: String(bt.show_time_id || bt.showTimeId || 'unknown-showtime-id'),
      quantity: parseInt(String(bt.quantity), 10) || 0,
      pricePerTicket: parseFloat(String(bt.price_per_ticket || bt.pricePerTicket)) || 0,
      eventNsid: String(bt.event_nsid || apiBooking.event_slug || bt.eventId || 'unknown-event-nsid'),
      createdAt: parseApiDateString(bt.created_at || bt.createdAt),
      updatedAt: parseApiDateString(bt.updated_at || bt.updatedAt),
    })),
    createdAt: parseApiDateString(apiBooking.created_at || apiBooking.createdAt),
    updatedAt: parseApiDateString(apiBooking.updated_at || apiBooking.updatedAt),
  };
};

export const createBooking = async (
  bookingData: {
    eventId: string; // This is the event's main ID
    userId: string;
    tickets: BookedTicketItem[]; // Array of items being booked
    totalPrice: number;
    billingAddress: BillingAddress;
  }
): Promise<Booking> => {
  // Fetch user details (mocked for now, should be from auth context or API)
  const user = await getUserByEmail(bookingData.userId); // Assuming userId passed is the email for mock
  if (!user) throw new Error("User not found for booking.");

  // Find event details to get event name, location, and specific event date for booking
  // This might require fetching the event if not readily available
  // For now, use eventNsid from the first ticket to look up the event
  const eventNsidForLookup = bookingData.tickets[0]?.eventNsid;
  if (!eventNsidForLookup) throw new Error("Event NSID (slug) missing from cart items for booking context.");

  const event = await getEventBySlug(eventNsidForLookup);
  if (!event || !event.showTimes) throw new Error("Event or its showtimes not found for booking context.");
  
  // Determine the specific event_date for this booking (from the showtime of the first ticket)
  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");
  
  const showTimeToUse = event.showTimes.find(st => st.id === showTimeId);
  if (!showTimeToUse) throw new Error(`ShowTime with ID ${showTimeId} not found on event ${event.id}.`);

  const apiPayload = {
    event_id: bookingData.eventId, // ID of the event being booked
    user_id: user.id, // Actual user ID
    booking_date: new Date().toISOString(),
    event_date: showTimeToUse.dateTime, // The specific date/time of the show for this booking
    event_name: event.name,
    event_location: event.location,
    // QR code value might be generated by the backend, or a placeholder initially
    qr_code_value: `EVENT:${event.slug},BOOKING_ID:TEMP_PENDING_API,SHOWTIME:${showTimeId}`,
    total_price: bookingData.totalPrice,
    billing_address: bookingData.billingAddress,
    booked_tickets: bookingData.tickets.map(ticket => ({
      event_nsid: ticket.eventNsid, // Slug of the event, can be redundant if event_id is primary
      ticket_type_id: ticket.ticketTypeId,
      ticket_type_name: ticket.ticketTypeName,
      quantity: ticket.quantity,
      price_per_ticket: ticket.pricePerTicket,
      show_time_id: ticket.showTimeId, // ID of the specific showtime for this ticket
    })),
  };

  try {
    const response = await fetch(BOOKINGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to create booking and parse error response.' }));
      console.error("API Error creating booking:", response.status, errorBody);
      throw new Error(errorBody.message || `Failed to create booking: ${response.status}`);
    }
    const createdApiBooking = await response.json();
    // console.log("Booking created via API, response:", createdApiBooking);
    return transformApiBookingToAppBooking(createdApiBooking);
  } catch (error) {
    console.error("Network or other error creating booking:", error);
    throw error;
  }
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  // console.log(`Fetching booking by ID: ${id} from: ${BOOKINGS_API_URL}/${id}`);
  try {
    const response = await fetch(`${BOOKINGS_API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        // console.log(`Booking with ID ${id} not found via API.`);
        return undefined;
      }
      const errorBodyText = await response.text();
      console.error(`API Error fetching booking ${id}: Status ${response.status}, Body: ${errorBodyText}`);
      let errorJsonMessage = 'Failed to parse error JSON.';
      try {
        const errorJson = JSON.parse(errorBodyText);
        errorJsonMessage = errorJson.message || JSON.stringify(errorJson);
      } catch (jsonError) {/* ignore */}
      throw new Error(`Failed to fetch booking ${id}: ${response.status}. Message: ${errorJsonMessage}`);
    }
    const apiBooking = await response.json();
    // console.log(`Raw booking data for ID ${id}:`, JSON.stringify(apiBooking, null, 2));
    return transformApiBookingToAppBooking(apiBooking);
  } catch (error) {
    console.error(`Network or other error fetching booking ${id}:`, error);
    return undefined;
  }
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  // console.log(`Fetching all admin bookings from: ${BOOKINGS_API_URL}`);
  try {
    const response = await fetch(BOOKINGS_API_URL);
    if (!response.ok) {
      let errorBodyText = 'Could not retrieve error body.';
      try {
        errorBodyText = await response.text();
      } catch (textError) {
        console.error("Failed to even get text from error response:", textError);
      }
      console.error("API Error fetching all admin bookings. Status:", response.status, "Body:", errorBodyText);
      let errorBodyJsonMessage = 'Failed to parse error JSON.';
      try {
        const errorJson = JSON.parse(errorBodyText);
        errorBodyJsonMessage = errorJson.message || JSON.stringify(errorJson);
      } catch (jsonError) { /* ignore */ }
      throw new Error(`Failed to fetch bookings: ${response.status}. Message: ${errorBodyJsonMessage}`);
    }

    const responseData = await response.json();
    // console.log("Raw response data from bookings API:", JSON.stringify(responseData, null, 2));

    // Check if responseData itself is the array, or if it's nested (e.g., under 'data' or 'bookings')
    const apiBookings: any[] = Array.isArray(responseData)
      ? responseData
      : responseData.data || responseData.bookings || []; // Add more potential keys if needed

    if (!Array.isArray(apiBookings)) {
        console.error("Bookings data from API is not an array and not under a known key (data, bookings). Received:", apiBookings);
        return [];
    }

    // console.log(`Found ${apiBookings.length} bookings from API. Mapping now...`);

    const mappedBookings = apiBookings.map(booking => {
      try {
        return transformApiBookingToAppBooking(booking);
      } catch (mapError) {
        console.error("Error mapping individual booking:", JSON.stringify(booking, null, 2), "Error:", mapError);
        return null; // Skip this booking if mapping fails
      }
    }).filter(booking => booking !== null) as Booking[]; // Filter out nulls and assert type

    // console.log(`Successfully mapped ${mappedBookings.length} bookings.`);

    return mappedBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
  } catch (error) {
    console.error("Network or other error fetching/processing all admin bookings:", error);
    return [];
  }
};


// Initialize mock data for local development if API_BASE_URL for events is not set
// and if ORGANIZERS_API_URL is set (implying real organizers but potentially mock events).
const initAdminMockData = async () => {
    // Prevent re-initialization if already done
    if (mockEventsStore.length > 0 && mockEventsStore.some(e => e.id === 'evt-predefined-1-admin')) return;

    // Only run if events are meant to be mocked (API_BASE_URL for events is not set)
    if (API_BASE_URL) {
        console.log("API_BASE_URL for events is set, skipping local mock event data initialization for admin.");
        return;
    }
    
    // Ensure we have organizers, preferably from API if configured
    const allOrganizers = await adminGetAllOrganizers(); // This will fetch from ORGANIZERS_API_URL if set
    if (!allOrganizers || allOrganizers.length === 0) {
        console.warn("No organizers found; cannot initialize admin mock event data that depends on an organizer.");
        // Optionally, create a mock organizer here if ORGANIZERS_API_URL is also not set
        // For now, we'll return if no organizers are available.
        return;
    }
    const org1 = allOrganizers[0]; // Use the first available organizer


    const defaultEventDataList: EventFormData[] = [
        {
            name: "Admin Mock Music Fest 2025",
            slug: "admin-summer-music-fest-2025",
            date: new Date(new Date().getFullYear() + 1, 5, 15), // June 15th next year
            location: "Grand Park, Downtown",
            description: "<p>Admin-managed music festival featuring top local and international artists. Enjoy a day of great music, food, and fun!</p>",
            category: "Festivals", // Ensure this category exists or is handled
            imageUrl: "https://placehold.co/800x450.png", // Placeholder
            organizerId: org1.id, // Use fetched organizer
            venueName: "Grand Park Main Stage",
            venueAddress: "123 Park Ave, Downtown",
            ticketTypes: [
                { id: generateId('tt'), name: "General Admission", price: 75, availability: 500, description: "Access to all stages." },
                { id: generateId('tt'), name: "VIP Pass", price: 250, availability: 100, description: "VIP lounge, front stage access, free merch." }
            ],
            showTimes: [
                { id: generateId('st'), dateTime: new Date(new Date().getFullYear() + 1, 5, 15, 18, 0), // 6 PM on main event day
                  ticketAvailabilities: [
                    // These ticketTypeIds will be dynamically assigned based on the IDs from above ticketTypes
                    { ticketTypeId: "NEEDS_REPLACEMENT_GA_ADMIN", ticketTypeName: "General Admission", availableCount: 200 },
                    { ticketTypeId: "NEEDS_REPLACEMENT_VIP_ADMIN", ticketTypeName: "VIP Pass", availableCount: 50 }
                  ]
                }
                // Add more showtimes if needed
            ]
        }
        // Add more mock EventFormData objects here
    ];

    // console.log("Initializing admin mock event data...");
    for (const eventData of defaultEventDataList) {
        // Ensure showTime ticketAvailabilities refer to the correct generated/existing ticketType IDs from eventData.ticketTypes
        const finalTicketTypes = eventData.ticketTypes; // These now have IDs (client-generated if new)
        const finalShowTimes = eventData.showTimes.map(st => {
            const newTicketAvailabilities = st.ticketAvailabilities.map(sta => {
                const parentTicketType = finalTicketTypes.find(tt => tt.name === sta.ticketTypeName);
                if (!parentTicketType || !parentTicketType.id) {
                    console.error(`Error in mock data init: Could not find parent ticket type for ${sta.ticketTypeName}`);
                    return { ...sta, ticketTypeId: 'error-tt-id-mock-init' }; // Fallback
                }
                return { ...sta, ticketTypeId: parentTicketType.id };
            });
            return { ...st, ticketAvailabilities: newTicketAvailabilities };
        });

        try {
          const createdEvent = await createEvent({ ...eventData, ticketTypes: finalTicketTypes, showTimes: finalShowTimes });
          // console.log("Mock admin event created:", createdEvent.name, createdEvent.id);
          // Assign a predictable ID for testing if needed, after creation
          if(createdEvent && eventData.name.includes("Admin Mock Music Fest")) createdEvent.id = 'evt-predefined-1-admin'; // Example
        } catch (error) {
          console.error("Failed to create mock admin event:", eventData.name, error);
        }
    }
    // console.log("Admin mock event data initialization complete. Mock events store:", mockEventsStore);
};

// Conditional initialization of mock data
if (!API_BASE_URL && ORGANIZERS_API_URL) { // Only mock events if organizers are from API
    initAdminMockData();
} else if (!API_BASE_URL && !ORGANIZERS_API_URL) {
    // This case means both events and organizers might be fully local/mock.
    // initAdminMockData might still run if it can source/create mock organizers, or fail if it strictly depends on API organizers.
    console.warn("Local mock data initialization for admin events will run. Ensure mock organizers are available or handled by initAdminMockData if ORGANIZERS_API_URL is not set.");
    // initAdminMockData(); // Consider if this should run or if organizers need to be mocked first.
}


    
