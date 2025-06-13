
import type { Event, Booking, User, Organizer, TicketType, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData, ShowTime, ShowTimeTicketAvailability } from './types';
import { parse, isValid } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
const BOOKINGS_API_URL = "https://gotickets-server.payshia.com/bookings";
const ORGANIZERS_API_URL = "https://gotickets-server.payshia.com/organizers";
const SHOWTIMES_BY_EVENT_API_URL_BASE = "https://gotickets-server.payshia.com/showtimes/event";
const AVAILABILITY_API_URL = "https://gotickets-server.payshia.com/availability";


// Helper to parse various date strings to ISO string
const parseApiDateString = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;

  const tryParseVariousFormats = (dateStr: string): Date | null => {
    const formatsToTry = [
      "yyyy-MM-dd HH:mm:ss.SSS",
      "yyyy-MM-dd HH:mm:ss",
      "yyyy-MM-dd'T'HH:mm:ss.SSSX", // ISO with timezone
      "yyyy-MM-dd'T'HH:mm:ssX",    // ISO with timezone
      "yyyy-MM-dd'T'HH:mm:ss.SSS", // ISO without Z
      "yyyy-MM-dd'T'HH:mm:ss",   // ISO without Z
      "yyyy-MM-dd",
    ];

    for (const fmt of formatsToTry) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (e) { /* Ignore and try next format */ }
    }
    // Fallback to native Date parsing if no format matches
    try {
      const nativeParsed = new Date(dateStr);
      if (isValid(nativeParsed)) {
        return nativeParsed;
      }
    } catch(e) { /* Ignore native parse error */ }
    
    console.warn(`Could not parse date string: "${dateStr}" with any known format or native Date. Returning null.`);
    return null;
  };

  const parsedDateObject = tryParseVariousFormats(dateString);

  if (parsedDateObject) {
    return parsedDateObject.toISOString();
  }
  
  console.warn(`parseApiDateString: Failed to parse "${dateString}" into a valid ISO string. Returning original or undefined.`);
  return dateString; 
};

// Define interfaces for flat API responses to avoid 'any'
interface ApiShowTimeTicketAvailabilityFlat {
  id: string; 
  showTimeId?: string;
  ticketTypeId?: string;
  ticketType?: { id: string; name: string; price: number }; 
  availableCount: number | string; 
  createdAt?: string;
  updatedAt?: string;
}

interface ApiShowTimeFlat {
  id: string;
  eventId?: string;
  dateTime: string;
  // ticketAvailabilities array is NOT expected directly from /showtimes/event/{eventId}
  // It will be populated from a separate call to /availability?showTimeId={id}
  createdAt?: string;
  updatedAt?: string;
}

interface ApiTicketTypeFlat {
    id: string;
    eventId?: string;
    name: string;
    price: number;
    availability: number; // This is template availability
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
  organizer?: Organizer; 
  ticketTypes?: ApiTicketTypeFlat[]; // Master list of ticket types for the event
  showTimes?: ApiShowTimeFlat[];   // This will likely be empty or not present from /events/slug, will be fetched separately
  createdAt?: string;
  updatedAt?: string;
}

const mapApiEventToAppEvent = (apiEvent: ApiEventFlat): Event => {
  const masterTicketTypes: TicketType[] = (apiEvent.ticketTypes || []).map((tt: ApiTicketTypeFlat) => ({
    id: tt.id,
    eventId: tt.eventId,
    name: tt.name,
    price: tt.price,
    availability: tt.availability, // Template/default availability
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
    showTimes: [], // Intentionally empty, will be populated by getEventBySlug after fetching separately
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
        createdAt: parseApiDateString(cat.createdAt),
        updatedAt: parseApiDateString(cat.updatedAt)
    }));
  } catch (error) {
    console.error(`Network error fetching public categories from internal route: ${INTERNAL_PUBLIC_CATEGORY_API_URL}`, error);
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
  
  if (!event) {
    return undefined;
  }

  // Fetch and attach full organizer details if only ID is present
  if (!event.organizer && event.organizerId) {
    try {
      const organizerDetails = await getOrganizerById(event.organizerId);
      if (organizerDetails) {
        event.organizer = organizerDetails;
      } else {
        console.warn(`Organizer with ID ${event.organizerId} not found for event ${slug}.`);
      }
    } catch (error) {
      console.error(`Error fetching organizer ${event.organizerId} for event ${slug}:`, error);
    }
  }

  // Fetch showtimes for the event
  const eventShowTimes: ShowTime[] = [];
  if (event.id && SHOWTIMES_BY_EVENT_API_URL_BASE) {
    try {
      const showtimesResponse = await fetch(`${SHOWTIMES_BY_EVENT_API_URL_BASE}/${event.id}`);
      if (!showtimesResponse.ok) {
        console.warn(`Failed to fetch showtimes for event ${event.id} (slug: ${slug}): ${showtimesResponse.status}`);
      } else {
        const basicShowTimes: ApiShowTimeFlat[] = await showtimesResponse.json();
        
        // For each basic showtime, fetch its availabilities
        for (const basicSt of basicShowTimes) {
          const detailedShowTime: ShowTime = {
            id: basicSt.id,
            eventId: basicSt.eventId || event.id,
            dateTime: parseApiDateString(basicSt.dateTime) || new Date().toISOString(),
            createdAt: parseApiDateString(basicSt.createdAt),
            updatedAt: parseApiDateString(basicSt.updatedAt),
            ticketAvailabilities: [], // Initialize
          };

          try {
            const availabilityResponse = await fetch(`${AVAILABILITY_API_URL}?showTimeId=${basicSt.id}`);
            if (!availabilityResponse.ok) {
              console.warn(`Failed to fetch availabilities for showTime ${basicSt.id} (event ${slug}): ${availabilityResponse.status}`);
            } else {
              const rawAvailabilities: ApiShowTimeTicketAvailabilityFlat[] = await availabilityResponse.json();
              
              detailedShowTime.ticketAvailabilities = rawAvailabilities.map(rawAvail => {
                const masterTicketTypes = event.ticketTypes || [];
                const foundMasterType = masterTicketTypes.find(mtt => mtt.id === rawAvail.ticketTypeId);
                let ticketTypeDetails: Pick<TicketType, 'id' | 'name' | 'price'>;

                if (rawAvail.ticketType && rawAvail.ticketType.id && rawAvail.ticketType.name && typeof rawAvail.ticketType.price === 'number') {
                    ticketTypeDetails = { id: rawAvail.ticketType.id, name: rawAvail.ticketType.name, price: rawAvail.ticketType.price };
                } else if (foundMasterType) {
                  ticketTypeDetails = { id: foundMasterType.id, name: foundMasterType.name, price: foundMasterType.price };
                } else {
                  console.warn(`Master TicketType with ID ${rawAvail.ticketTypeId} not found for showtime ${basicSt.id}, availability ${rawAvail.id}.`);
                  ticketTypeDetails = { id: rawAvail.ticketTypeId || 'unknown-tt-id', name: 'Unknown Ticket Type', price: 0 };
                }
                return {
                  id: rawAvail.id,
                  showTimeId: rawAvail.showTimeId || basicSt.id,
                  ticketTypeId: ticketTypeDetails.id,
                  ticketType: ticketTypeDetails,
                  availableCount: parseInt(String(rawAvail.availableCount), 10) || 0,
                  createdAt: parseApiDateString(rawAvail.createdAt),
                  updatedAt: parseApiDateString(rawAvail.updatedAt),
                };
              });
            }
          } catch (error) {
            console.error(`Error fetching availabilities for showTime ${basicSt.id} (event ${slug}):`, error);
          }
          eventShowTimes.push(detailedShowTime);
        }
      }
    } catch (error) {
      console.error(`Error fetching showtimes for event ${event.id} (slug: ${slug}):`, error);
    }
  }
  event.showTimes = eventShowTimes;

  if (event.showTimes.length === 0) {
      console.warn(`No showtimes were successfully fetched or populated for event ${slug}.`);
  } else {
      event.showTimes.forEach(st => {
          if (st.ticketAvailabilities.length === 0) {
              console.warn(`Showtime ${st.id} for event ${slug} has no ticket availabilities after fetch.`);
          } else if (st.ticketAvailabilities.some(ta => ta.ticketType.name === 'Unknown Ticket Type')) {
              console.warn(`Showtime ${st.id} for event ${slug} has some ticket availabilities with 'Unknown Ticket Type'. Check master ticketTypes and availability linking.`);
          }
      });
  }
  
  return event;
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (query) params.set('name_like', query); 
  if (category) params.set('category', category);
  if (date) params.set('date_gte', date); 
  if (location) params.set('location_like', location); 
  return fetchEventsFromApi(params);
};


// In-memory data stores for entities NOT yet migrated to API or for specific mock scenarios
const mockUsers: User[] = [
  { id: 'user-1', email: 'admin@example.com', name: 'Admin User', isAdmin: true, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'user-2', email: 'customer@example.com', name: 'Regular Customer', isAdmin: false, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
let mockEventsStore: Event[] = []; 

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
        id: String(cat.id), 
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockUsers.push(newUser);
  return newUser;
};

export const updateUser = async (userId: string, dataToUpdate: Partial<User>): Promise<User | null> => {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  mockUsers[userIndex] = { ...mockUsers[userIndex], ...dataToUpdate, updatedAt: new Date().toISOString() };
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

// --- Organizer Management (API Based) ---
const mapApiOrganizerToAppOrganizer = (apiOrganizer: any): Organizer => {
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
    const apiOrganizer = await response.json();
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
    const newApiOrganizer = await response.json();
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
    const updatedApiOrganizer = await response.json();
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
  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`; 
  const finalSlug = baseSlug; 

  const newEventId = generateId('evt'); 

  const ticketTypes: TicketType[] = data.ticketTypes.map(ttData => ({
    id: ttData.id && !ttData.id.startsWith('client-') ? ttData.id : generateId('tt'), 
    eventId: newEventId, 
    name: ttData.name,
    price: ttData.price,
    availability: ttData.availability, 
    description: ttData.description || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const showTimes: ShowTime[] = data.showTimes.map(stData => {
    const showTimeId = stData.id && !stData.id.startsWith('client-') ? stData.id : generateId('st'); 
    return {
      id: showTimeId,
      eventId: newEventId, 
      dateTime: stData.dateTime.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
        const parentTicketType = ticketTypes.find(tt => tt.id === staData.ticketTypeId || tt.name === staData.ticketTypeName);
        if (!parentTicketType) {
          console.error(`Ticket type template for "${staData.ticketTypeName}" (ID: ${staData.ticketTypeId}) not found.`);
          throw new Error(`Ticket type template for "${staData.ticketTypeName}" not found for showtime.`);
        }
        return {
          id: staData.id && !staData.id.startsWith('client-') ? staData.id : generateId('sta'), 
          showTimeId: showTimeId, 
          ticketTypeId: parentTicketType.id, 
          ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price }, 
          availableCount: staData.availableCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
    };
  });

  const eventPayloadForApi = {
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
    ticketTypes: data.ticketTypes.map(tt => ({name: tt.name, price: tt.price, availability: tt.availability, description: tt.description})),
    showTimes: data.showTimes.map(st => ({
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        ticketTypeName: sta.ticketTypeName, 
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
    return mapApiEventToAppEvent(createdApiEvent); 
  } else {
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
      venueName: data.venueName,
      venueAddress: data.venueAddress || null,
      ticketTypes, 
      showTimes,   
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockEventsStore.push(newEvent);
    return newEvent;
  }
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  const categoryName = data.category.trim();
  const finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

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
    ticketTypes: data.ticketTypes, 
    showTimes: data.showTimes.map(st => ({
      id: st.id?.startsWith('client-') ? undefined : st.id, 
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        id: sta.id?.startsWith('client-') ? undefined : sta.id, 
        ticketTypeId: sta.ticketTypeId, 
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
        id: existingTt?.id || generateId('tt'), 
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
      const showTimeId = existingSt?.id || generateId('st'); 
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
      organizer: organizer, 
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


// --- Booking Management (API based) ---

export const transformApiBookingToAppBooking = (apiBooking: any): Booking => {
  let parsedBillingAddress: BillingAddress;
  if (typeof apiBooking.billing_address === 'string') {
    try {
      parsedBillingAddress = JSON.parse(apiBooking.billing_address);
    } catch (e) {
      console.error("Failed to parse billing_address string:", e, "Raw:", apiBooking.billing_address);
      parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" }; // Default
    }
  } else if (typeof apiBooking.billing_address === 'object' && apiBooking.billing_address !== null) {
    parsedBillingAddress = apiBooking.billing_address;
  } else {
    parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" }; // Default
  }

  const rawTotalPrice = apiBooking.total_price ?? apiBooking.totalPrice; 
  let parsedPrice = parseFloat(String(rawTotalPrice)); 
  if (!Number.isFinite(parsedPrice)) { 
      console.warn(`Invalid totalPrice value received: ${rawTotalPrice} for booking ID ${apiBooking.id}. Defaulting to 0.`);
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
    qrCodeValue: apiBooking.qr_code_value || apiBooking.qrCodeValue || `BOOKING:${apiBooking.id}`, 
    totalPrice: parsedPrice,
    billingAddress: parsedBillingAddress,
    bookedTickets: (apiBooking.booked_tickets || apiBooking.bookedTickets || []).map((bt: any) => ({
      id: String(bt.id),
      bookingId: String(bt.booking_id || bt.bookingId || apiBooking.id), 
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
    eventId: string; 
    userId: string;
    tickets: BookedTicketItem[]; 
    totalPrice: number;
    billingAddress: BillingAddress;
  }
): Promise<Booking> => {
  const user = await getUserByEmail(bookingData.userId); 
  if (!user) throw new Error("User not found for booking.");

  const eventNsidForLookup = bookingData.tickets[0]?.eventNsid;
  if (!eventNsidForLookup) throw new Error("Event NSID (slug) missing from cart items for booking context.");

  const event = await getEventBySlug(eventNsidForLookup);
  if (!event || !event.showTimes) throw new Error("Event or its showtimes not found for booking context.");
  
  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");
  
  const showTimeToUse = event.showTimes.find(st => st.id === showTimeId);
  if (!showTimeToUse) throw new Error(`ShowTime with ID ${showTimeId} not found on event ${event.id}.`);

  const apiPayload = {
    event_id: bookingData.eventId, 
    user_id: user.id, 
    booking_date: new Date().toISOString(),
    event_date: showTimeToUse.dateTime, 
    event_name: event.name,
    event_location: event.location,
    qr_code_value: `EVENT:${event.slug},BOOKING_ID:TEMP_PENDING_API,SHOWTIME:${showTimeId}`,
    total_price: bookingData.totalPrice,
    billing_address: bookingData.billingAddress,
    booked_tickets: bookingData.tickets.map(ticket => ({
      event_nsid: ticket.eventNsid, 
      ticket_type_id: ticket.ticketTypeId,
      ticket_type_name: ticket.ticketTypeName,
      quantity: ticket.quantity,
      price_per_ticket: ticket.pricePerTicket,
      show_time_id: ticket.showTimeId, 
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
    return transformApiBookingToAppBooking(createdApiBooking);
  } catch (error) {
    console.error("Network or other error creating booking:", error);
    throw error;
  }
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  console.log(`Attempting to fetch booking by ID: ${id} from: ${BOOKINGS_API_URL}/${id}`);
  try {
    const response = await fetch(`${BOOKINGS_API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Booking with ID ${id} not found (404).`);
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
    const mappedBooking = transformApiBookingToAppBooking(apiBooking);
    return mappedBooking;
  } catch (error) {
    console.error(`Network or other error fetching booking ${id}:`, error);
    return undefined;
  }
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  console.log(`Attempting to fetch all admin bookings from: ${BOOKINGS_API_URL}`);
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
    const apiBookings: any[] = Array.isArray(responseData)
      ? responseData
      : responseData.data || responseData.bookings || []; 

    if (!Array.isArray(apiBookings)) {
        console.error("Bookings data from API is not an array and not under a known key (data, bookings). Received:", apiBookings);
        return [];
    }

    console.log(`Found ${apiBookings.length} bookings from API. Mapping now...`);

    const mappedBookings = apiBookings.map(booking => {
      try {
        return transformApiBookingToAppBooking(booking);
      } catch (mapError) {
        console.error("Error mapping individual booking:", JSON.stringify(booking, null, 2), "Error:", mapError);
        return null; 
      }
    }).filter(booking => booking !== null) as Booking[]; 

    console.log(`Successfully mapped ${mappedBookings.length} bookings.`);

    return mappedBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
  } catch (error) {
    console.error("Network or other error fetching/processing all admin bookings:", error);
    return [];
  }
};


const initAdminMockData = async () => {
    if (mockEventsStore.length > 0 && mockEventsStore.some(e => e.id === 'evt-predefined-1-admin')) return;

    if (API_BASE_URL) {
        return;
    }
    
    if (!ORGANIZERS_API_URL) {
      console.warn("ORGANIZERS_API_URL not set. Skipping admin mock event data initialization as it requires an organizer.");
      return;
    }

    const allOrganizers = await adminGetAllOrganizers(); 
    if (!allOrganizers || allOrganizers.length === 0) {
        console.warn("No organizers found (or ORGANIZERS_API_URL not set/returning empty); cannot initialize admin mock event data that depends on an organizer.");
        return;
    }
    const org1 = allOrganizers[0]; 


    const defaultEventDataList: EventFormData[] = [
        {
            name: "Admin Mock Music Fest 2025",
            slug: "admin-summer-music-fest-2025",
            date: new Date(new Date().getFullYear() + 1, 5, 15), 
            location: "Grand Park, Downtown",
            description: "<p>Admin-managed music festival featuring top local and international artists. Enjoy a day of great music, food, and fun!</p>",
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
                    console.error(`Error in mock data init: Could not find parent ticket type for ${sta.ticketTypeName}`);
                    return { ...sta, ticketTypeId: 'error-tt-id-mock-init' }; 
                }
                return { ...sta, ticketTypeId: parentTicketType.id };
            });
            return { ...st, ticketAvailabilities: newTicketAvailabilities };
        });

        try {
          const createdEvent = await createEvent({ ...eventData, ticketTypes: finalTicketTypes, showTimes: finalShowTimes });
          if(createdEvent && eventData.name.includes("Admin Mock Music Fest")) createdEvent.id = 'evt-predefined-1-admin'; 
        } catch (error) {
          console.error("Failed to create mock admin event:", eventData.name, error);
        }
    }
};

if (!API_BASE_URL && ORGANIZERS_API_URL) { 
    initAdminMockData();
} else if (!API_BASE_URL && !ORGANIZERS_API_URL) {
    console.warn("Local mock data initialization for admin events will run. Mock organizers might be created if initAdminMockData handles it or fetched if ORGANIZERS_API_URL is set independently.");
}
