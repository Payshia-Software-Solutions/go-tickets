
import type { Event, Booking, User, Organizer, TicketType, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData, SignupFormData } from './types';
import { parse, isValid, format, parseISO } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
const BOOKINGS_API_URL = "https://gotickets-server.payshia.com/bookings";
const ORGANIZERS_API_URL = "https://gotickets-server.payshia.com/organizers";
const USERS_API_URL = "https://gotickets-server.payshia.com/users";
const USER_LOGIN_API_URL = "https://gotickets-server.payshia.com/users/login";

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
    eventId?: string; // API might send this as number, ensure mapping handles it if string is needed
    name: string;
    price: string; // API sends string
    availability: string; // API sends string
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

// Interface for the direct response from /availability endpoint
interface AvailabilityRecord {
  id: string;
  showTimeId: string;
  ticketTypeId: string;
  availableCount: string; // API returns string
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
  if (eventBase.id && SHOWTIMES_BY_EVENT_API_URL_BASE && AVAILABILITY_API_URL) {
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
          let rawAvailabilities: AvailabilityRecord[] = [];
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
          
          // Map rawAvailabilities (which are AvailabilityRecord) to ShowTimeTicketAvailability
          detailedShowTime.ticketAvailabilities = rawAvailabilities
            .filter(avail => masterTicketTypes.some(masterTt => masterTt.id === avail.ticketTypeId)) // Ensure master TT exists
            .map(avail => {
                const masterTt = masterTicketTypes.find(m => m.id === avail.ticketTypeId)!; // We filtered above
                return {
                    id: avail.id, // This is the ID of the availability record itself
                    showTimeId: avail.showTimeId,
                    ticketTypeId: avail.ticketTypeId,
                    ticketType: { id: masterTt.id, name: masterTt.name, price: masterTt.price },
                    availableCount: parseInt(avail.availableCount, 10) || 0,
                    createdAt: parseApiDateString(avail.createdAt),
                    updatedAt: parseApiDateString(avail.updatedAt),
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

  if (eventBase.showTimes.length === 0 && masterTicketTypes.length > 0) {
      console.warn(`[getEventBySlug] No showtimes were successfully fetched or populated for event ${slug}, but master ticket types exist. Event page may not show showtimes.`);
  } else if (eventBase.showTimes.length > 0) {
      eventBase.showTimes.forEach(st => {
          if (st.ticketAvailabilities.length === 0 && masterTicketTypes.length > 0) {
              console.warn(`[getEventBySlug] Showtime ${st.id} for event ${slug} has no ticket availabilities after fetch, even though master ticket types exist. This means no availability records were found for this showtime, or all are sold out (count 0).`);
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
  { id: 'user-1', email: 'admin@example.com', password: "password123", name: 'Admin User', isAdmin: true, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'user-2', email: 'customer@example.com', password: "password123", name: 'Regular Customer', isAdmin: false, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
  password?: string;
  name?: string | null;
  isAdmin: string | number; // API sends '0' or '1'
  createdAt?: string;
  updatedAt?: string;
  billing_street?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
}

const mapApiUserToAppUser = (apiUser: RawApiUser): User => {
  let billingAddress: BillingAddress | null = null;
  if (
    apiUser.billing_street ||
    apiUser.billing_city ||
    apiUser.billing_state ||
    apiUser.billing_postal_code ||
    apiUser.billing_country
  ) {
    billingAddress = {
      street: apiUser.billing_street || "",
      city: apiUser.billing_city || "",
      state: apiUser.billing_state || "",
      postalCode: apiUser.billing_postal_code || "",
      country: apiUser.billing_country || "",
    };
  }

  return {
    id: String(apiUser.id),
    email: apiUser.email,
    password: apiUser.password, // This field is usually not sent to the client
    name: apiUser.name || null,
    isAdmin: String(apiUser.isAdmin) === "1" || Number(apiUser.isAdmin) === 1, // Handle string '0'/'1' or number 0/1
    billingAddress: billingAddress,
    createdAt: parseApiDateString(apiUser.createdAt),
    updatedAt: parseApiDateString(apiUser.updatedAt),
  };
};

export const loginUserWithApi = async (email: string, password_from_form: string): Promise<User> => {
  console.log(`[loginUserWithApi] Attempting login for email: ${email}`);
  try {
    const response = await fetch(USER_LOGIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: password_from_form }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let responseData: any = {};
    try {
      responseData = await response.json();
    } catch (jsonError) {
      console.warn(`[loginUserWithApi] Could not parse JSON response. Status: ${response.status}. Error:`, jsonError);
      if (response.status === 401) { // Unauthorized
        throw new Error("Invalid email or password.");
      }
      if (!response.ok) {
         const errorText = await response.text().catch(() => "Could not read error response body.");
         throw new Error(`Login failed: ${response.status}. Server response: ${errorText.substring(0,150)}`);
      }
      // If parsing failed but response was somehow OK (unlikely for JSON API)
      throw new Error("Login response was not valid JSON.");
    }

    if (!response.ok) {
      let errorMessage = responseData.message;
      if (response.status === 401 && !errorMessage) { // Unauthorized, but API didn't provide a message
        errorMessage = "Invalid email or password.";
      } else if (!errorMessage) { // Other errors, but API didn't provide a message
        errorMessage = `Login failed: ${response.status}. Please try again.`;
      }
      
      // Refined console logging: only log responseData if it's not an empty object when message is generic for 401
      if (errorMessage === "Invalid email or password." && responseData && Object.keys(responseData).length === 0) {
        console.error(`[loginUserWithApi] API Error: ${errorMessage}`);
      } else {
        console.error(`[loginUserWithApi] API Error: ${errorMessage}`, responseData);
      }
      throw new Error(errorMessage);
    }

    if (responseData.user) {
      console.log("[loginUserWithApi] Login successful. Raw user data:", responseData.user);
      const appUser = mapApiUserToAppUser(responseData.user as RawApiUser);
      console.log("[loginUserWithApi] Mapped app user:", appUser);
      return appUser;
    } else {
      console.error("[loginUserWithApi] Login response OK, but no user object in responseData.user. Response:", responseData);
      throw new Error("Login successful, but user data was not returned correctly by the API.");
    }
  } catch (error) {
    console.error("[loginUserWithApi] Network or other error during login:", error);
    if (error instanceof Error) { // Re-throw if already an Error object
      throw error;
    }
    // Wrap other error types (e.g., strings from non-JSON responses)
    throw new Error("An unexpected error occurred during login. Please check your connection and try again.");
  }
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


export const createUser = async (data: SignupFormData): Promise<User> => {
  if (API_BASE_URL && USERS_API_URL) {
    console.log(`[createUser] Attempting to create user via API: ${USERS_API_URL} for email: ${data.email}`);
    const payload: Partial<RawApiUser> = {
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password, // Sending password
      isAdmin: '0', // Default to not admin
      billing_street: data.billing_street || undefined,
      billing_city: data.billing_city || undefined,
      billing_state: data.billing_state || undefined,
      billing_postal_code: data.billing_postal_code || undefined,
      billing_country: data.billing_country || undefined,
    };
    
    // Remove undefined fields from payload to avoid sending them as null if not intended
    Object.keys(payload).forEach(key => {
      const K = key as keyof typeof payload;
      if (payload[K] === undefined || payload[K] === '') {
        delete payload[K];
      }
    });
    
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
    if (mockUsers.some(u => u.email === data.email.toLowerCase())) {
      throw new Error("User with this email already exists in mock store.");
    }
    const newUser: User = {
      id: generateId('user'),
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password, // Storing password in mock (not secure for real apps)
      isAdmin: false,
      billingAddress: (data.billing_street || data.billing_city) ? { // Check if any billing info is present
          street: data.billing_street || "",
          city: data.billing_city || "",
          state: data.billing_state || "",
          postalCode: data.billing_postal_code || "",
          country: data.billing_country || "",
      } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    return newUser;
  }
};

export const updateUser = async (userId: string, dataToUpdate: Partial<User>): Promise<User | null> => {
  if (API_BASE_URL && USERS_API_URL) {
    const apiPayload: Partial<RawApiUser> = {};

    if (dataToUpdate.name !== undefined) apiPayload.name = dataToUpdate.name;
    if (dataToUpdate.email !== undefined) apiPayload.email = dataToUpdate.email;
    if (dataToUpdate.isAdmin !== undefined) apiPayload.isAdmin = dataToUpdate.isAdmin ? '1' : '0';
    
    if (dataToUpdate.billingAddress === null) {
        apiPayload.billing_street = null;
        apiPayload.billing_city = null;
        apiPayload.billing_state = null;
        apiPayload.billing_postal_code = null;
        apiPayload.billing_country = null;
    } else if (dataToUpdate.billingAddress) {
        apiPayload.billing_street = dataToUpdate.billingAddress.street;
        apiPayload.billing_city = dataToUpdate.billingAddress.city;
        apiPayload.billing_state = dataToUpdate.billingAddress.state;
        apiPayload.billing_postal_code = dataToUpdate.billingAddress.postalCode;
        apiPayload.billing_country = dataToUpdate.billingAddress.country;
    }

    try {
      const response = await fetch(`${USERS_API_URL}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const errorBody = await response.json().catch(() => ({ message: `Failed to update user ${userId} via API and parse error. Status: ${response.status}` }));
        
        let detailedErrorMessage = errorBody.message || `API error updating user ${userId}: ${response.status}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (errorBody.errors && typeof errorBody.errors === 'object' && !Array.isArray(errorBody.errors)) {
          const fieldErrors = Object.entries(errorBody.errors)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map(([field, messages]: [string, any]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : String(messages))}`)
            .join('; ');
          if (fieldErrors) {
            detailedErrorMessage = `${detailedErrorMessage}. Details: ${fieldErrors}`;
          }
        } else if (Array.isArray(errorBody.errors)) {
            detailedErrorMessage = `${detailedErrorMessage}. Details: ${errorBody.errors.join('; ')}`;
        }
        throw new Error(detailedErrorMessage);
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
  // New fields based on sample
  showtime?: string;
  tickettype?: string;
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
    // @ts-ignore
    if (apiBooking.billing_street || apiBooking.billing_city) {
        parsedBillingAddress = {
            // @ts-ignore
            street: apiBooking.billing_street || "",
            // @ts-ignore
            city: apiBooking.billing_city || "",
            // @ts-ignore
            state: apiBooking.billing_state || "",
            // @ts-ignore
            postalCode: apiBooking.billing_postal_code || "",
            // @ts-ignore
            country: apiBooking.billing_country || "",
        };
    } else {
        parsedBillingAddress = { street: "", city: "", state: "", postalCode: "", country: "" };
    }
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
    showtime: apiBooking.showtime,
    tickettype: apiBooking.tickettype,
    createdAt: parseApiDateString(apiBooking.created_at || apiBooking.createdAt),
    updatedAt: parseApiDateString(apiBooking.updated_at || apiBooking.updatedAt),
  };
};


// --- Ticket Availability Update Functions ---
async function patchAvailabilityRecord(availabilityRecordId: string, newCount: number): Promise<boolean> {
  if (!AVAILABILITY_API_URL) {
    console.error("AVAILABILITY_API_URL is not defined. Cannot update availability.");
    return false;
  }
  const url = `${AVAILABILITY_API_URL}/${availabilityRecordId}`;
  const payload = { availableCount: String(newCount) };
  console.log(`[patchAvailabilityRecord] Updating availability ID ${availabilityRecordId} to count ${newCount}. URL: ${url}, Payload:`, payload);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `API error ${response.status} updating availability.` }));
      console.error(`[patchAvailabilityRecord] Failed to update availability for record ${availabilityRecordId}. Status: ${response.status}`, errorBody);
      return false;
    }
    console.log(`[patchAvailabilityRecord] Successfully updated availability for record ${availabilityRecordId}.`);
    return true;
  } catch (error) {
    console.error(`[patchAvailabilityRecord] Network or other error updating availability for record ${availabilityRecordId}:`, error);
    return false;
  }
}

async function updateAvailabilityForBookedItem(ticketTypeId: string, showTimeId: string, quantityBooked: number): Promise<void> {
  if (!AVAILABILITY_API_URL) {
    console.error("[updateAvailabilityForBookedItem] AVAILABILITY_API_URL is not defined.");
    return;
  }
  const fetchUrl = `${AVAILABILITY_API_URL}?showTimeId=${showTimeId}`;
  console.log(`[updateAvailabilityForBookedItem] Fetching availability records for showTimeId: ${showTimeId}, ticketTypeId: ${ticketTypeId} from ${fetchUrl}`);

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.error(`[updateAvailabilityForBookedItem] Failed to fetch availability records for showTimeId ${showTimeId}. Status: ${response.status}`, await response.text());
      return;
    }
    const availabilityRecords: AvailabilityRecord[] = await response.json();
    if (!Array.isArray(availabilityRecords)) {
        console.error(`[updateAvailabilityForBookedItem] Expected array of availability records for showTimeId ${showTimeId}, got:`, availabilityRecords);
        return;
    }

    const specificRecord = availabilityRecords.find(ar => ar.ticketTypeId === ticketTypeId);

    if (specificRecord) {
      const currentCount = parseInt(specificRecord.availableCount, 10);
      if (isNaN(currentCount)) {
        console.error(`[updateAvailabilityForBookedItem] Invalid currentAvailableCount '${specificRecord.availableCount}' for record ${specificRecord.id}.`);
        return;
      }
      const newCount = currentCount - quantityBooked;
      const countToSet = Math.max(0, newCount);
      
      if (newCount < 0) {
        console.warn(`[updateAvailabilityForBookedItem] Calculated new count ${newCount} is less than 0 for record ${specificRecord.id}. Setting to 0. This indicates an oversell or data sync issue.`);
      }
      await patchAvailabilityRecord(specificRecord.id, countToSet);
    } else {
      console.warn(`[updateAvailabilityForBookedItem] No availability record found for showTimeId ${showTimeId} and ticketTypeId ${ticketTypeId}. Cannot update count.`);
    }
  } catch (error) {
    console.error(`[updateAvailabilityForBookedItem] Error processing availability for showTimeId ${showTimeId}, ticketTypeId ${ticketTypeId}:`, error);
  }
}

async function _updateMasterTicketTypeTemplateAvailability(ticketTypeId: string, quantityBooked: number, eventId: string): Promise<void> {
  if (!TICKET_TYPES_API_URL) {
    console.error("[_updateMasterTicketTypeTemplateAvailability] TICKET_TYPES_API_URL is not defined.");
    return;
  }

  let ticketTypeToUpdate: ApiTicketTypeFromEndpoint | undefined;
  try {
    const getResponse = await fetch(`${TICKET_TYPES_API_URL}/${ticketTypeId}`);
    if (getResponse.ok) {
      ticketTypeToUpdate = await getResponse.json();
      if (String(ticketTypeToUpdate?.eventId) !== String(eventId)) {
        // Safety check: if the fetched ticket type doesn't belong to the event, something is wrong.
        console.warn(`Fetched master TicketType ID ${ticketTypeId} belongs to event ${ticketTypeToUpdate?.eventId}, expected ${eventId}. Ignoring update.`);
        return;
      }
    } else if (getResponse.status === 404) {
      console.warn(`Master TicketType ID ${ticketTypeId} not found via direct GET /ticket-types/${ticketTypeId}.`);
      // If not found by direct ID (perhaps API doesn't support GET by ID), then fallback cannot be used easily here without more context.
      // The original fallback to fetchTicketTypesForEvent(eventId) might be too broad if eventId is not readily available or reliable.
      // For now, if direct GET fails with 404, we assume the ticket type doesn't exist or can't be fetched this way.
      return;
    } else {
      console.error(`Failed to GET master TicketType ID ${ticketTypeId}: ${getResponse.status} - ${await getResponse.text()}`);
      return; // Don't proceed if GET failed for other reasons
    }
  } catch (e) {
    console.error(`Error during GET master TicketType ID ${ticketTypeId}: ${e}.`);
    return; // Don't proceed on network error
  }

  if (!ticketTypeToUpdate) {
    console.error(`Master TicketType ID ${ticketTypeId} could not be fetched or found. Cannot update template availability.`);
    return;
  }

  const currentTemplateAvailability = parseInt(ticketTypeToUpdate.availability, 10);
  if (isNaN(currentTemplateAvailability)) {
    console.error(`Invalid template availability "${ticketTypeToUpdate.availability}" for master TicketType ID ${ticketTypeId}.`);
    return;
  }

  const newTemplateAvailability = Math.max(0, currentTemplateAvailability - quantityBooked);

  const putPayload: ApiTicketTypeFromEndpoint = {
    ...ticketTypeToUpdate, // Spread all existing fields
    availability: String(newTemplateAvailability), // Update availability
    updatedAt: new Date().toISOString(), // Update timestamp
  };

  // Ensure eventId is a string if it exists in the payload from GET
  if (putPayload.eventId !== undefined) {
    putPayload.eventId = String(putPayload.eventId);
  }


  console.log(`[_updateMasterTicketTypeTemplateAvailability] Updating master TicketType ID ${ticketTypeId} template availability to ${newTemplateAvailability}. PUT payload:`, JSON.stringify(putPayload));

  try {
    const putResponse = await fetch(`${TICKET_TYPES_API_URL}/${ticketTypeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload),
    });

    if (!putResponse.ok) {
      const errorBody = await putResponse.json().catch(() => ({ message: `API error ${putResponse.status}` }));
      console.error(`Failed to update master TicketType ID ${ticketTypeId} template availability. Status: ${putResponse.status}`, errorBody);
    } else {
      console.log(`Successfully updated master TicketType ID ${ticketTypeId} template availability.`);
    }
  } catch (error) {
    console.error(`Network error updating master TicketType ID ${ticketTypeId} template availability:`, error);
  }
}


export const createBooking = async (
  bookingData: {
    eventId: string;
    userId: string;
    tickets: BookedTicketItem[];
    totalPrice: number;
    billingAddress: BillingAddress;
  }
): Promise<Booking> => {
  const eventNsidForLookup = bookingData.tickets[0]?.eventNsid;
  if (!eventNsidForLookup) throw new Error("Event NSID (slug) missing from cart items for booking context.");

  const event = await getEventBySlug(eventNsidForLookup);
  if (!event || !event.showTimes) throw new Error("Event or its showtimes not found for booking context.");
  
  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");
  
  const showTimeToUse = event.showTimes.find(st => st.id === showTimeId);
  if (!showTimeToUse) throw new Error(`ShowTime with ID ${showTimeId} not found on event ${event.id}.`);

  const showTimeDateTime = parseISO(showTimeToUse.dateTime);

  const apiPayload = {
    userId: parseInt(bookingData.userId, 10),
    eventId: parseInt(bookingData.eventId, 10),
    totalPrice: bookingData.totalPrice,
    eventName: event.name,
    eventDate: showTimeToUse.dateTime, 
    eventLocation: event.location,
    qrCodeValue: `QR_BOOKING_${generateId()}`,
    showtime: format(showTimeDateTime, "HH:mm:ss"), 
    tickettype: bookingData.tickets.map(t => t.ticketTypeName).join(', '), 
  };
  console.log("[createBooking] Sending payload to API /bookings:", JSON.stringify(apiPayload, null, 2));

  let createdApiBooking: RawApiBooking;
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
    createdApiBooking = await response.json();
  } catch (error) {
    console.error("Network or other error creating booking:", error);
    throw error;
  }

  if (createdApiBooking && createdApiBooking.id) {
    console.log(`[createBooking] Booking ${createdApiBooking.id} created. Now updating availabilities for ${bookingData.tickets.length} ticket item(s)...`);
    for (const ticketItem of bookingData.tickets) {
      try {
        // Updates showtime-specific availability (AvailabilityRecord)
        await updateAvailabilityForBookedItem(ticketItem.ticketTypeId, ticketItem.showTimeId, ticketItem.quantity);
        
        // Updates master TicketType template availability
        await _updateMasterTicketTypeTemplateAvailability(ticketItem.ticketTypeId, ticketItem.quantity, bookingData.eventId);

      } catch (availError) {
        console.error(`[createBooking] Failed to update availability for ticketType ${ticketItem.ticketTypeId} on showTime ${ticketItem.showTimeId} for booking ${createdApiBooking.id}. Error:`, availError);
      }
    }
  }

  const appBooking = transformApiBookingToAppBooking(createdApiBooking);
  appBooking.billingAddress = bookingData.billingAddress; 
  return appBooking;
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

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  if (!BOOKINGS_API_URL) {
    console.error("BOOKINGS_API_URL is not defined. Cannot fetch user bookings.");
    return [];
  }
  const url = `${BOOKINGS_API_URL}/user/${userId}`;
  console.log(`[getUserBookings] Fetching bookings for user ID ${userId} from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getUserBookings] No bookings found for user ${userId} (404).`);
        return [];
      }
      const errorBodyText = await response.text();
      console.error(`[getUserBookings] API Error fetching bookings for user ${userId}. Status: ${response.status}, Body: ${errorBodyText}`);
      return [];
    }
    const apiBookings: RawApiBooking[] = await response.json();
    if (!Array.isArray(apiBookings)) {
      console.error(`[getUserBookings] Expected array of bookings for user ${userId}, got:`, apiBookings);
      return [];
    }
    console.log(`[getUserBookings] Found ${apiBookings.length} bookings for user ${userId}. Mapping now...`);
    return apiBookings.map(transformApiBookingToAppBooking).sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
  } catch (error) {
    console.error(`[getUserBookings] Network or other error fetching bookings for user ${userId}:`, error);
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

    
