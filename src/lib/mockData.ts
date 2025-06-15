
import type { Event, Booking, User, Organizer, TicketType, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData } from './types';
import { parse, isValid } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
const BOOKINGS_API_URL = "https://gotickets-server.payshia.com/bookings";
const ORGANIZERS_API_URL = "https://gotickets-server.payshia.com/organizers";
const USERS_API_URL = "https://gotickets-server.payshia.com/users";

const SHOWTIMES_BY_EVENT_API_URL_BASE = "https://gotickets-server.payshia.com/showtimes/event";
const AVAILABILITY_API_URL = "https://gotickets-server.payshia.com/availability";
const TICKET_TYPES_API_URL = "https://gotickets-server.payshia.com/ticket-types";


// Helper to parse various date strings to ISO string
const parseApiDateString = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;

  const tryParseVariousFormats = (dateStr: string): Date | null => {
    const formatsToTry = [
      "yyyy-MM-dd HH:mm:ss.SSSX", // With milliseconds and timezone
      "yyyy-MM-dd HH:mm:ssX",    // With timezone
      "yyyy-MM-dd HH:mm:ss.SSS", // With milliseconds, no Z
      "yyyy-MM-dd HH:mm:ss",   // No milliseconds, no Z
      "yyyy-MM-dd'T'HH:mm:ss.SSSX", // ISO with milliseconds and timezone
      "yyyy-MM-dd'T'HH:mm:ssX",    // ISO with timezone
      "yyyy-MM-dd'T'HH:mm:ss.SSS", // ISO with milliseconds, no Z
      "yyyy-MM-dd'T'HH:mm:ss",   // ISO no Z
      "yyyy-MM-dd",
    ];

    for (const fmt of formatsToTry) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch { /* Ignore and try next format */ }
    }
    // Fallback to native Date parsing if no format matches
    try {
      const nativeParsed = new Date(dateStr);
      if (isValid(nativeParsed)) {
        return nativeParsed;
      }
    } catch { /* Ignore native parse error */ }
    
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
  availableCount: string | number; 
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

interface ApiTicketTypeFromEndpoint { 
    id: string;
    eventId?: string; 
    name: string;
    price: string; 
    availability: string; 
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
  createdAt?: string;
  updatedAt?: string;
}

const mapApiEventToAppEvent = (apiEvent: ApiEventFlat): Event => {
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
    ticketTypes: [], 
    showTimes: [], 
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


const fetchTicketTypesForEvent = async (eventId: string): Promise<TicketType[]> => {
  if (!TICKET_TYPES_API_URL) {
    console.warn("TICKET_TYPES_API_URL is not defined. Cannot fetch ticket types.");
    return [];
  }
  const url = `${TICKET_TYPES_API_URL}?eventid=${eventId}`; 
  try {
    console.log(`Fetching ticket types for event ${eventId} from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
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
      name: tt.name,
      price: parseFloat(tt.price) || 0,
      availability: parseInt(tt.availability, 10) || 0, 
      description: tt.description || null,
      createdAt: parseApiDateString(tt.createdAt),
      updatedAt: parseApiDateString(tt.updatedAt),
    }));
  } catch (error) {
    console.error(`Network error fetching ticket types for event ${eventId}:`, error);
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
  console.log(`[getEventBySlug] Fetching event by slug: ${slug}`);
  const eventBase = await fetchEventBySlugFromApi(slug);
  
  if (!eventBase) {
    console.warn(`[getEventBySlug] Event with slug "${slug}" not found via fetchEventBySlugFromApi.`);
    return undefined;
  }
  console.log(`[getEventBySlug] Base event data fetched for slug "${slug}": ID ${eventBase.id}, Name: ${eventBase.name}`);

  if (!eventBase.organizer && eventBase.organizerId) {
    try {
      console.log(`[getEventBySlug] Fetching organizer details for ID: ${eventBase.organizerId} (event: ${slug})`);
      const organizerDetails = await getOrganizerById(eventBase.organizerId);
      if (organizerDetails) {
        eventBase.organizer = organizerDetails;
        console.log(`[getEventBySlug] Organizer details attached for event: ${slug}`);
      } else {
        console.warn(`[getEventBySlug] Organizer with ID ${eventBase.organizerId} not found for event ${slug}.`);
      }
    } catch (error) {
      console.error(`[getEventBySlug] Error fetching organizer ${eventBase.organizerId} for event ${slug}:`, error);
    }
  }

  const masterTicketTypes = await fetchTicketTypesForEvent(eventBase.id);
  eventBase.ticketTypes = masterTicketTypes;

  if (!eventBase.ticketTypes || eventBase.ticketTypes.length === 0) {
      console.warn(`[getEventBySlug] No master ticket types found or fetched for event ${slug} (ID: ${eventBase.id}). Booking page might not work correctly.`);
  } else {
      console.log(`[getEventBySlug] Fetched ${eventBase.ticketTypes.length} master ticket types for event ${slug} (ID: ${eventBase.id}).`);
  }

  const populatedShowTimes: ShowTime[] = [];
  if (eventBase.id && SHOWTIMES_BY_EVENT_API_URL_BASE) {
    console.log(`[getEventBySlug] Fetching showtimes for event ID: ${eventBase.id} (slug: ${slug}) from ${SHOWTIMES_BY_EVENT_API_URL_BASE}/${eventBase.id}`);
    try {
      const showtimesResponse = await fetch(`${SHOWTIMES_BY_EVENT_API_URL_BASE}/${eventBase.id}`);
      if (!showtimesResponse.ok) {
        console.warn(`[getEventBySlug] Failed to fetch showtimes for event ${eventBase.id} (slug: ${slug}): ${showtimesResponse.status} - ${await showtimesResponse.text()}`);
      } else {
        const basicShowTimesFromApi: ApiShowTimeFlat[] = await showtimesResponse.json();
        console.log(`[getEventBySlug] Fetched ${basicShowTimesFromApi.length} basic showtimes for event ${eventBase.id} (slug: ${slug}).`);
        
        for (const basicSt of basicShowTimesFromApi) {
          const detailedShowTime: ShowTime = {
            id: basicSt.id,
            eventId: basicSt.eventId || eventBase.id,
            dateTime: parseApiDateString(basicSt.dateTime) || new Date().toISOString(),
            createdAt: parseApiDateString(basicSt.createdAt),
            updatedAt: parseApiDateString(basicSt.updatedAt),
            ticketAvailabilities: [], 
          };

          console.log(`[getEventBySlug] Fetching availabilities for showTime ID: ${basicSt.id} (event: ${slug}) from ${AVAILABILITY_API_URL}?showTimeId=${basicSt.id}`);
          let rawAvailabilities: ApiShowTimeTicketAvailabilityFlat[] = [];
          try {
            const availabilityResponse = await fetch(`${AVAILABILITY_API_URL}?showTimeId=${basicSt.id}`);
            if (!availabilityResponse.ok) {
              console.warn(`[getEventBySlug] Failed to fetch availabilities for showTime ${basicSt.id} (event ${slug}): ${availabilityResponse.status} - ${await availabilityResponse.text()}`);
            } else {
              rawAvailabilities = await availabilityResponse.json();
              console.log(`[getEventBySlug] Fetched ${rawAvailabilities.length} availability records for showTime ${basicSt.id} (event ${slug}).`);
            }
          } catch (error) {
            console.error(`[getEventBySlug] Error fetching availabilities for showTime ${basicSt.id} (event ${slug}):`, error);
          }
          
          const availabilitiesMap = new Map<string, ApiShowTimeTicketAvailabilityFlat>();
          rawAvailabilities.forEach(avail => {
            if (avail.ticketTypeId) {
              availabilitiesMap.set(String(avail.ticketTypeId), avail);
            }
          });
          
          detailedShowTime.ticketAvailabilities = masterTicketTypes.map(masterTt => {
            const specificAvailability = availabilitiesMap.get(masterTt.id);
            const availableCount = specificAvailability ? (parseInt(String(specificAvailability.availableCount), 10) || 0) : 0;
            const availabilityRecordId = specificAvailability ? specificAvailability.id : generateId('sta-mock');

            return {
              id: availabilityRecordId,
              showTimeId: basicSt.id,
              ticketTypeId: masterTt.id,
              ticketType: { id: masterTt.id, name: masterTt.name, price: masterTt.price },
              availableCount: availableCount,
              createdAt: specificAvailability ? parseApiDateString(specificAvailability.createdAt) : undefined,
              updatedAt: specificAvailability ? parseApiDateString(specificAvailability.updatedAt) : undefined,
            };
          });
          
          populatedShowTimes.push(detailedShowTime);
        }
      }
    } catch (error) {
      console.error(`[getEventBySlug] Error fetching or processing showtimes for event ${eventBase.id} (slug: ${slug}):`, error);
    }
  }
  eventBase.showTimes = populatedShowTimes;

  if (eventBase.showTimes.length === 0 && masterTicketTypes.length > 0) { // Check if masterTicketTypes has items
      console.warn(`[getEventBySlug] No showtimes were successfully fetched or populated for event ${slug}, but master ticket types exist. Event page may not show showtimes.`);
  } else if (eventBase.showTimes.length > 0) {
      eventBase.showTimes.forEach(st => {
          if (st.ticketAvailabilities.length === 0 && masterTicketTypes.length > 0) {
              console.warn(`[getEventBySlug] Showtime ${st.id} for event ${slug} has no ticket availabilities after fetch, even though master ticket types exist. This means no availability records were found for this showtime, or all are sold out (count 0).`);
          } else if (st.ticketAvailabilities.length !== (masterTicketTypes.length || 0)) {
              console.warn(`[getEventBySlug] Mismatch in ticket availability count for showtime ${st.id} (Event ${slug}). Expected ${masterTicketTypes.length}, got ${st.ticketAvailabilities.length}. This means not all master ticket types had corresponding availability records or were defaulted to 0.`);
          }
      });
  }
  console.log(`[getEventBySlug] Finished processing event by slug "${slug}". Returning event object with ${eventBase.showTimes.length} showtimes and ${eventBase.ticketTypes?.length} master ticket types.`);
  return eventBase;
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
       const errorBody = await response.json().catch(() => ({ message: 'Failed to delete category and parse error response.' }));
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


// --- User Management (API or Mock) ---
interface RawApiUser {
  id: string | number;
  email: string;
  name?: string | null;
  isAdmin: string | number; // Expecting "0" or "1", or number 0 or 1
  createdAt?: string;
  updatedAt?: string;
  // billingAddress might be a JSON string or an object from API, or not present
  billing_address?: string | BillingAddress | null;
}

const mapApiUserToAppUser = (apiUser: RawApiUser): User => {
  let billingAddress: BillingAddress | null = null;
  if (typeof apiUser.billing_address === 'string') {
    try {
      billingAddress = JSON.parse(apiUser.billing_address);
    } catch {
      // console.warn("Failed to parse billing_address string for user:", apiUser.id);
      billingAddress = null;
    }
  } else if (typeof apiUser.billing_address === 'object' && apiUser.billing_address !== null) {
    billingAddress = apiUser.billing_address;
  }

  return {
    id: String(apiUser.id),
    email: apiUser.email,
    name: apiUser.name || null,
    isAdmin: String(apiUser.isAdmin) === "1" || Number(apiUser.isAdmin) === 1,
    billingAddress: billingAddress,
    createdAt: parseApiDateString(apiUser.createdAt),
    updatedAt: parseApiDateString(apiUser.updatedAt),
  };
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedQueryEmail = email.toLowerCase();
  if (API_BASE_URL && USERS_API_URL) {
    const fetchUrl = `${USERS_API_URL}?email=${encodeURIComponent(normalizedQueryEmail)}`;
    console.log(`[getUserByEmail] Fetching from: ${fetchUrl}`);
    try {
      const response = await fetch(fetchUrl);
      console.log(`[getUserByEmail] Response status for ${normalizedQueryEmail}: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[getUserByEmail] User ${normalizedQueryEmail} not found (404). Returning null.`);
          return null;
        }
        const errorText = await response.text();
        console.error(`[getUserByEmail] API Error fetching user by email ${normalizedQueryEmail}: Status ${response.status}, Body: ${errorText}`);
        return null; 
      }

      const responseText = await response.text();
      console.log(`[getUserByEmail] Raw API response for ${normalizedQueryEmail}: ${responseText}`); 
      
      let usersData: RawApiUser[] = [];
      try {
        usersData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[getUserByEmail] Failed to parse JSON response for ${normalizedQueryEmail}:`, parseError, "Raw text was:", responseText);
        return null;
      }

      console.log(`[getUserByEmail] Parsed usersData for ${normalizedQueryEmail}:`, usersData);

      if (usersData && usersData.length > 0) {
        const foundUser = usersData.find(u => u.email.toLowerCase() === normalizedQueryEmail);
        if (foundUser) {
            console.log(`[getUserByEmail] User ${normalizedQueryEmail} found in API response. Returning user.`);
            return mapApiUserToAppUser(foundUser);
        } else {
            console.log(`[getUserByEmail] User ${normalizedQueryEmail} NOT strictly found in API response list (checked ${usersData.length} users). Returning null.`);
            return null;
        }
      }
      console.log(`[getUserByEmail] No user data or empty array for ${normalizedQueryEmail}. Returning null.`);
      return null;
    } catch (error) {
      console.error(`[getUserByEmail] Network error fetching user by email ${normalizedQueryEmail}:`, error);
      return null;
    }
  } else {
    console.warn("[getUserByEmail] API_BASE_URL or USERS_API_URL not set, using local mockUsers.");
    return mockUsers.find(user => user.email.toLowerCase() === normalizedQueryEmail) || null;
  }
};


export const createUser = async (userData: { email: string, name?: string, isAdmin?: boolean }): Promise<User> => {
  if (API_BASE_URL && USERS_API_URL) {
    console.log(`[createUser] Attempting to create user via API: ${USERS_API_URL} for email: ${userData.email}`);
    const payload = {
      email: userData.email,
      name: userData.name || '',
      isAdmin: userData.isAdmin ? '1' : '0', 
    };
    try {
      const response = await fetch(USERS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: `API error ${response.status} during user creation.` }));
        if (response.status === 409 || (errorBody.message && (errorBody.message.toLowerCase().includes('duplicate') || errorBody.message.toLowerCase().includes('already exists') || errorBody.message.toLowerCase().includes('already in use')))) {
            throw new Error("This email address is already in use on the server.");
        }
        throw new Error(errorBody.message || `API error creating user: ${response.status}`);
      }
      const newApiUser: RawApiUser = await response.json();
      return mapApiUserToAppUser(newApiUser);
    } catch (error) { 
      console.error("[createUser] Error in API call:", error);
      throw error; 
    }
  } else {
    console.warn("[createUser] API_BASE_URL or USERS_API_URL not set, using local mockUsers.");
    if (mockUsers.some(u => u.email === userData.email)) {
      throw new Error("User with this email already exists in mock store.");
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
  }
};

export const updateUser = async (userId: string, dataToUpdate: Partial<User>): Promise<User | null> => {
  if (API_BASE_URL && USERS_API_URL) {
    const apiPayload: Partial<RawApiUser & { billing_address?: BillingAddress | null }> = {};

    if (dataToUpdate.name !== undefined) apiPayload.name = dataToUpdate.name;
    if (dataToUpdate.email !== undefined) apiPayload.email = dataToUpdate.email;
    if (dataToUpdate.isAdmin !== undefined) apiPayload.isAdmin = dataToUpdate.isAdmin ? '1' : '0';
    
    if (dataToUpdate.billingAddress !== undefined) {
        // Send as a direct object or null, not stringified
        apiPayload.billing_address = dataToUpdate.billingAddress;
    }

    try {
      const response = await fetch(`${USERS_API_URL}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const errorBody = await response.json().catch(() => ({ message: `Failed to update user ${userId} via API and parse error` }));
        throw new Error(errorBody.message || `API error updating user ${userId}: ${response.status}`);
      }
      const updatedApiUser: RawApiUser = await response.json();
      return mapApiUserToAppUser(updatedApiUser);
    } catch (error) {
      console.error(`Network or other error updating user ${userId} via API:`, error);
      throw error; 
    }

  } else {
    console.warn(`API_BASE_URL or USERS_API_URL not set, updateUser using local mockUsers for user ID: ${userId}.`);
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
  }
};

// --- Organizer Management (API Based) ---
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
    if (createdApiEvent.slug) {
      const fullyPopulatedEvent = await getEventBySlug(createdApiEvent.slug);
      if (fullyPopulatedEvent) return fullyPopulatedEvent;
      console.warn("Failed to re-fetch fully populated event after creation, returning API response as is.");
    }
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
    ticketTypes: data.ticketTypes.map(tt => ({
      id: tt.id?.startsWith('client-') ? undefined : tt.id,
      name: tt.name, 
      price: tt.price, 
      availability: tt.availability, 
      description: tt.description
    })), 
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
    if (updatedApiEvent.slug) {
      const fullyPopulatedEvent = await getEventBySlug(updatedApiEvent.slug);
      if (fullyPopulatedEvent) return fullyPopulatedEvent;
      console.warn("Failed to re-fetch fully populated event after update, returning API response as is.");
    }
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
        id: existingTt?.id || ttData.id || generateId('tt'),
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
      const showTimeId = existingSt?.id || stData.id || generateId('st'); 
      return {
        id: showTimeId,
        eventId,
        dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
          const parentTicketType = updatedTicketTypes.find(tt => tt.id === staData.ticketTypeId || (tt.name === staData.ticketTypeName && !staData.ticketTypeId));
          if (!parentTicketType) throw new Error(`Ticket type template ${staData.ticketTypeName} (ID: ${staData.ticketTypeId}) not found in updated list.`);
          
          const existingStaInOriginalShowTime = existingSt?.ticketAvailabilities.find(esta => esta.ticketType.id === parentTicketType.id);
          return {
            id: existingStaInOriginalShowTime?.id || staData.id || generateId('sta'),
            showTimeId,
            ticketTypeId: parentTicketType.id,
            ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
            availableCount: staData.availableCount,
            createdAt: existingStaInOriginalShowTime?.createdAt || new Date().toISOString(),
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
interface RawApiBookedTicket {
  id: string | number;
  booking_id?: string | number; 
  bookingId?: string | number;   
  ticket_type_id?: string | number;
  ticketTypeId?: string | number;
  ticket_type_name?: string;
  ticketTypeName?: string;
  show_time_id?: string | number;
  showTimeId?: string | number;
  quantity: string | number; 
  price_per_ticket?: string | number; 
  pricePerTicket?: string | number;
  event_nsid?: string;
  event_slug?: string; 
  eventId?: string; 
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface RawApiBooking {
  id: string | number;
  event_id?: string | number; 
  eventId?: string | number;   
  user_id?: string | number;
  userId?: string | number;
  booking_date?: string;
  bookingDate?: string;
  event_date?: string;
  eventDate?: string;
  event_name?: string;
  eventName?: string;
  event_location?: string;
  eventLocation?: string;
  qr_code_value?: string;
  qrCodeValue?: string;
  total_price?: string | number; 
  totalPrice?: string | number;
  billing_address?: string | BillingAddress; 
  booked_tickets?: RawApiBookedTicket[]; 
  bookedTickets?: RawApiBookedTicket[];   
  event_slug?: string; 
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}


export const transformApiBookingToAppBooking = (apiBooking: RawApiBooking): Booking => {
  let parsedBillingAddress: BillingAddress;
  if (typeof apiBooking.billing_address === 'string') {
    try {
      parsedBillingAddress = JSON.parse(apiBooking.billing_address);
    } catch {
      console.error("Failed to parse billing_address string:", "Raw:", apiBooking.billing_address);
      parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" }; 
    }
  } else if (typeof apiBooking.billing_address === 'object' && apiBooking.billing_address !== null) {
    parsedBillingAddress = apiBooking.billing_address;
  } else {
    parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" }; 
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
    bookedTickets: (apiBooking.booked_tickets || apiBooking.bookedTickets || []).map((bt: RawApiBookedTicket) => ({
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
    const createdApiBooking: RawApiBooking = await response.json();
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
      } catch {}
      throw new Error(`Failed to fetch booking ${id}: ${response.status}. Message: ${errorJsonMessage}`);
    }
    const apiBooking: RawApiBooking = await response.json();
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
      } catch {
        console.error("Failed to even get text from error response:");
      }
      console.error("API Error fetching all admin bookings. Status:", response.status, "Body:", errorBodyText);
      let errorBodyJsonMessage = 'Failed to parse error JSON.';
      try {
        const errorJson = JSON.parse(errorBodyText);
        errorBodyJsonMessage = errorJson.message || JSON.stringify(errorJson);
      } catch {}
      throw new Error(`Failed to fetch bookings: ${response.status}. Message: ${errorBodyJsonMessage}`);
    }

    const responseData = await response.json();
    const apiBookings: RawApiBooking[] = Array.isArray(responseData)
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
        console.warn("No organizers found; cannot initialize admin mock event data that depends on an organizer.");
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
                    { id: generateId('sta'), ticketTypeId: "NEEDS_REPLACEMENT_GA_ADMIN", ticketTypeName: "General Admission", availableCount: 200 },
                    { id: generateId('sta'), ticketTypeId: "NEEDS_REPLACEMENT_VIP_ADMIN", ticketTypeName: "VIP Pass", availableCount: 50 }
                  ]
                }
            ]
        }
    ];

    for (const eventData of defaultEventDataList) {
        try {
          const createdEvent = await createEvent(eventData);
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

