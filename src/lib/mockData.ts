

import type { Event, Booking, User, Organizer, TicketType, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData, SignupFormData, BookedTicket, ShowTimeTicketAvailability, ShowTime, TicketTypeFormData, CoreEventFormData, AddShowTimeFormData } from './types';
import { parse, isValid, format, parseISO } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
const BOOKINGS_API_URL = "https://gotickets-server.payshia.com/bookings";
const BOOKED_TICKETS_API_URL = "https://gotickets-server.payshia.com/booked-tickets";
const ORGANIZERS_API_URL = "https://gotickets-server.payshia.com/organizers";
const USERS_API_URL = "https://gotickets-server.payshia.com/users";
const USER_LOGIN_API_URL = "https://gotickets-server.payshia.com/users/login";

const SHOWTIMES_API_URL = "https://gotickets-server.payshia.com/showtimes";
const SHOWTIMES_BY_EVENT_API_URL_BASE = "https://gotickets-server.payshia.com/showtimes/event";
const TICKET_TYPES_API_URL = "https://gotickets-server.payshia.com/ticket-types";
const TICKET_TYPES_AVAILABILITY_API_URL = "https://gotickets-server.payshia.com/ticket-types/availability";
const TICKET_TYPES_UPDATE_FULL_API_URL = "https://gotickets-server.payshia.com/ticket-types/update/full";
const TICKET_TYPES_UPDATE_AVAILABILITY_API_URL = "https://gotickets-server.payshia.com/ticket-types/update/availability";


// Count URLs
const EVENTS_COUNT_API_URL = "https://gotickets-server.payshia.com/events/get/count";
const BOOKINGS_COUNT_API_URL = "https://gotickets-server.payshia.com/bookings/get/count";
const USERS_COUNT_API_URL = "https://gotickets-server.payshia.com/users/get/count";


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

interface ApiShowTimeFlat {
  id: string;
  eventId?: string;
  dateTime: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiTicketTypeFromEndpoint {
    id: string;
    eventId?: string | number;
    showtimeId?: string | null; // Added showtimeId
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
        name: cat.name.trim(),
        createdAt: parseApiDateString(cat.createdAt),
        updatedAt: parseApiDateString(cat.updatedAt)
    }));
  } catch (error) {
    console.error(`Network error fetching public categories from internal route: ${INTERNAL_PUBLIC_CATEGORY_API_URL}`, error);
    return [];
  }
};


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
        // This is an expected case for a new event with no ticket types yet.
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
    .sort((a, b) => ((b.ticketTypes?.length || 0) + (b.showTimes?.length || 0)) - ((a.ticketTypes?.length || 0) + a.showTimes?.length || 0))
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
  
  // This re-uses the full data fetching logic, now centralized
  return getFullEventDetails(eventBase);
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string): Promise<Event[]> => {
  if (!API_BASE_URL) {
    // Fallback for when API is not configured
    console.warn("API_BASE_URL is not defined. searchEvents is disabled and will return no results.");
    return [];
  }

  const params = new URLSearchParams();
  if (query) params.set('name', query); // Assuming 'name' for text search
  if (category) params.set('category', category.trim());
  if (date) params.set('date', date);
  if (location) params.set('location', location);

  // If no filters are provided, it's better to fetch all events than to call a filter endpoint with no params.
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
      return []; // Return empty on error
    }

    const responseData = await response.json();

    // Based on the user's provided sample response format
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
        name: cat.name.trim(),
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


// --- Event Management ---

// Centralized function to fully populate an event object
const getFullEventDetails = async (eventBase: Event): Promise<Event | undefined> => {
  if (!eventBase) return undefined;
  console.log(`[getFullEventDetails] Populating details for event: ${eventBase.name} (ID: ${eventBase.id})`);
  
  try {
    // 1. Populate Organizer
    if (!eventBase.organizer && eventBase.organizerId) {
      const organizerDetails = await getOrganizerById(eventBase.organizerId);
      if (organizerDetails) {
        eventBase.organizer = organizerDetails;
      } else {
        console.warn(`[getFullEventDetails] Organizer with ID ${eventBase.organizerId} not found.`);
      }
    }

    // 2. Fetch Master Ticket Types for the event
    const masterTicketTypes = await fetchTicketTypesForEvent(eventBase.id);
    eventBase.ticketTypes = masterTicketTypes;
    if (masterTicketTypes.length === 0) {
      console.warn(`[getFullEventDetails] No master ticket types found for event ${eventBase.id}.`);
    }

    // 3. Fetch Showtimes and their specific availabilities
    const populatedShowTimes: ShowTime[] = [];
    if (!SHOWTIMES_BY_EVENT_API_URL_BASE) {
      console.warn("[getFullEventDetails] Showtime API URL is not configured. Cannot fetch showtimes.");
      eventBase.showTimes = [];
    } else {
      const showtimesResponse = await fetch(`${SHOWTIMES_BY_EVENT_API_URL_BASE}/${eventBase.id}`);
      if (!showtimesResponse.ok) {
        console.warn(`[getFullEventDetails] Failed to fetch showtimes for event ${eventBase.id}: ${showtimesResponse.status}`);
      } else {
        const basicShowTimesFromApi: ApiShowTimeFlat[] = await showtimesResponse.json();
        
        for (const basicSt of basicShowTimesFromApi) {
          const detailedShowTime: ShowTime = {
            id: basicSt.id,
            eventId: basicSt.eventId || eventBase.id,
            dateTime: parseApiDateString(basicSt.dateTime) || new Date().toISOString(),
            ticketAvailabilities: [], // To be populated next
            createdAt: parseApiDateString(basicSt.createdAt),
            updatedAt: parseApiDateString(basicSt.updatedAt),
          };

          const availabilityUrl = `${TICKET_TYPES_AVAILABILITY_API_URL}?eventid=${eventBase.id}&showtimeid=${basicSt.id}`;
          const availabilityResponse = await fetch(availabilityUrl);
          if (availabilityResponse.ok) {
            const responseJson = await availabilityResponse.json();
            if (responseJson.success && Array.isArray(responseJson.data)) {
              detailedShowTime.ticketAvailabilities = responseJson.data
                .map((availRecord: { id: string; name: string; availability: string }) => {
                  // The 'id' in this response is the ticketTypeId
                  const masterTt = masterTicketTypes.find(tt => tt.id === availRecord.id);
                  if (!masterTt) {
                    console.warn(`[getFullEventDetails] Availability record for ticket type ID ${availRecord.id} found, but no matching master ticket type definition exists for event ${eventBase.id}.`);
                    return null;
                  }
                  
                  return {
                    id: `sta-${basicSt.id}-${masterTt.id}`, // Create a stable, unique ID for form keying
                    showTimeId: basicSt.id,
                    ticketTypeId: masterTt.id,
                    ticketType: { id: masterTt.id, name: masterTt.name, price: masterTt.price },
                    availableCount: parseInt(availRecord.availability, 10) || 0,
                  };
                })
                .filter((item): item is ShowTimeTicketAvailability => item !== null);
            }
          } else {
            console.warn(`[getFullEventDetails] Failed to fetch availabilities for showTime ${basicSt.id}. URL: ${availabilityUrl}, Status: ${availabilityResponse.status}`);
          }
          populatedShowTimes.push(detailedShowTime);
        }
      }
    }
    
    eventBase.showTimes = populatedShowTimes;
    console.log(`[getFullEventDetails] Finished populating event ${eventBase.id}. Returning with ${eventBase.showTimes.length} showtimes.`);
    return eventBase;

  } catch (error) {
    console.error(`[getFullEventDetails] A critical error occurred while populating details for event ${eventBase.id}:`, error);
    // In case of a failure during population, return the base event object, but log the issue.
    // It's better to show partial data than to crash the entire page.
    return eventBase;
  }
};


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
  console.log(`[getAdminEventById] Fetching event by ID: ${id}`);
  if (!API_BASE_URL) {
    console.warn("API_BASE_URL not set, getAdminEventById using local mockEventsStore.");
    return mockEventsStore.find(event => event.id === id);
  }
  
  try {
    const eventBase = await fetchEventByIdFromApi(id);
    if (!eventBase) {
      console.warn(`[getAdminEventById] Event with ID "${id}" not found.`);
      return undefined;
    }
    
    // Use the centralized function to populate all details
    return await getFullEventDetails(eventBase);
  } catch (error) {
    console.error(`[getAdminEventById] Error during fetch or processing for event ID ${id}:`, error);
    return undefined; // Return undefined if population fails catastrophically
  }
};

export const createEvent = async (data: CoreEventFormData): Promise<string> => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined. Cannot create event.");
  }
  const eventPayloadForApi = {
    name: data.name,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    venueName: data.venueName,
    venueAddress: data.venueAddress || null,
  };
  const eventResponse = await fetch(`${API_BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventPayloadForApi),
  });

  if (!eventResponse.ok) {
    const errorBody = await eventResponse.json().catch(() => ({ message: 'Failed to create event and parse error' }));
    throw new Error(errorBody.message || `API error creating event: ${eventResponse.status}`);
  }
  
  const createEventResponse: { message: string; newEventId: string } = await eventResponse.json();
  if (!createEventResponse.newEventId) {
    throw new Error("API did not return a newEventId for the newly created event.");
  }
  return createEventResponse.newEventId;
};

export const createTicketType = async (eventId: string, data: TicketTypeFormData): Promise<TicketType> => {
    const payload = {
      name: data.name,
      price: data.price,
      availability: data.availability,
      description: data.description || "",
      eventId: eventId,
      showtimeId: data.showtimeId,
    };

    console.log(`[createTicketType] Creating ticket type association.`);
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
        availability: parseInt(newTicketTypeApi.availability, 10),
        description: newTicketTypeApi.description || null
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
      ticketAvailabilities: [], // This is a simplified view for listing
      createdAt: parseApiDateString(st.createdAt),
      updatedAt: parseApiDateString(st.updatedAt),
    }));
  } catch (error) {
    console.error(`Network error fetching showtimes for event ${eventId} from ${url}:`, error);
    return [];
  }
};

export const createShowTime = async (eventId: string, data: AddShowTimeFormData): Promise<ShowTime> => {
    const payload = {
      eventId: eventId,
      dateTime: format(data.dateTime, "yyyy-MM-dd HH:mm:ss"),
    };
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
    // Return a shell showtime object; availabilities will be managed separately.
    return {
        id: newShowTimeApi.id,
        eventId: newShowTimeApi.eventId,
        dateTime: parseApiDateString(newShowTimeApi.dateTime) || new Date().toISOString(),
        ticketAvailabilities: [],
    };
};

export const updateEvent = async (eventId: string, data: EventFormData, initialData: Event): Promise<void> => {
  if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not defined. Cannot update event.");
  }
  
  console.log(`%c[updateEvent] Starting intelligent update for event ID: ${eventId}`, 'color: #8833ff; font-weight: bold;');

  // Step 1: Update the main event details if they have changed
  const mainDetailsChanged = 
    data.name !== initialData.name ||
    data.slug !== initialData.slug ||
    new Date(data.date).getTime() !== new Date(initialData.date).getTime() ||
    data.location !== initialData.location ||
    data.description !== initialData.description ||
    data.category !== initialData.category ||
    data.imageUrl !== initialData.imageUrl ||
    data.organizerId !== initialData.organizerId ||
    data.venueName !== initialData.venueName ||
    data.venueAddress !== (initialData.venueAddress || "");

  if (mainDetailsChanged) {
    const eventPayloadForApi = {
      name: data.name,
      slug: data.slug,
      date: data.date.toISOString(),
      location: data.location,
      description: data.description,
      category: data.category,
      imageUrl: data.imageUrl,
      organizerId: data.organizerId,
      venueName: data.venueName,
      venueAddress: data.venueAddress || null,
    };
    
    const eventUpdateUrl = `${API_BASE_URL}/events/${eventId}`;
    console.log(`%c[updateEvent] Core details changed. Updating...`, 'color: blue;');
    console.log(`  - URL: PUT ${eventUpdateUrl}`);
    console.log(`  - Payload:`, eventPayloadForApi);
    
    const eventResponse = await fetch(eventUpdateUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayloadForApi),
    });

    if (!eventResponse.ok) {
      const errorBody = await eventResponse.json().catch(() => ({ message: 'Failed to update event and parse error' }));
      throw new Error(errorBody.message || `API error updating event ${eventId}: ${eventResponse.status}`);
    }
    console.log(`[updateEvent] Step 1 complete: Main event details updated.`);
  } else {
    console.log(`%c[updateEvent] Core details have not changed. Skipping update.`, 'color: green;');
  }
  
  // Step 2 & 3: Synchronize Showtimes and their specific Ticket Types
  console.log(`%c[updateEvent] Starting Steps 2 & 3: Syncing Showtimes and Tickets...`, 'color: #8833ff; font-weight: bold;');
  for (const stData of data.showTimes) {
    const showtimeId = stData.id;
    const initialShowTime = initialData.showTimes?.find(st => st.id === showtimeId);
    if (!showtimeId || !initialShowTime) {
      console.warn(`[updateEvent] Skipping showtime with temporary/missing ID: ${showtimeId}. It should be created via 'Add Showtime'.`);
      continue;
    }

    // Update the showtime's date/time if it has changed
    if (new Date(stData.dateTime).getTime() !== new Date(initialShowTime.dateTime).getTime()) {
      const showtimeUpdatePayload = {
        eventId: eventId,
        dateTime: format(new Date(stData.dateTime), "yyyy-MM-dd HH:mm:ss")
      };
      const updateShowtimeUrl = `${SHOWTIMES_API_URL}/${showtimeId}`;
      console.log(`%c[updateEvent] Showtime ${showtimeId} dateTime changed. Updating...`, 'color: blue;');
      console.log(`  - URL: PUT ${updateShowtimeUrl}`);
      console.log(`  - Payload:`, showtimeUpdatePayload);

      const stResponse = await fetch(updateShowtimeUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(showtimeUpdatePayload)
      });
      if (!stResponse.ok) {
          console.error(`[updateEvent] Failed to update showtime ${showtimeId}. Status: ${stResponse.status}`, await stResponse.text());
          continue; 
      }
    } else {
        console.log(`%c[updateEvent] Showtime ${showtimeId} dateTime has not changed. Skipping update.`, 'color: green;');
    }
    
    // Process ticket availabilities for this showtime
    for (const staData of stData.ticketAvailabilities) {
        const ticketTypeId = staData.ticketTypeId;
        const ticketTypeDefinition = data.ticketTypes.find(tt => tt.id === ticketTypeId);
        const initialTicketDefinition = initialData.ticketTypes?.find(tt => tt.id === ticketTypeId);
        const initialSta = initialShowTime.ticketAvailabilities.find(sta => sta.ticketType.id === ticketTypeId);

        if (!ticketTypeDefinition?.id || !initialTicketDefinition) {
            console.warn(`[updateEvent] Skipping ticket availability update for new/unlinked ticket type ID "${ticketTypeId}" in showtime ${showtimeId}. This should be handled via an 'Add' button.`);
            continue;
        }

        const definitionChanged = 
            ticketTypeDefinition.name !== initialTicketDefinition.name ||
            ticketTypeDefinition.price !== initialTicketDefinition.price ||
            (ticketTypeDefinition.description || '') !== (initialTicketDefinition.description || '');
            
        const availabilityChanged = initialSta ? staData.availableCount !== initialSta.availableCount : true;

        if (definitionChanged || availabilityChanged) {
            const fullUpdateUrl = `${TICKET_TYPES_UPDATE_FULL_API_URL}?eventid=${eventId}&showtimeid=${showtimeId}&tickettypeid=${ticketTypeId}`;
            const fullUpdatePayload = {
                name: ticketTypeDefinition.name,
                price: ticketTypeDefinition.price,
                description: ticketTypeDefinition.description || "",
                availability: staData.availableCount,
            };
            
            console.log(`%c[updateEvent] Ticket details or availability changed for TT_ID ${ticketTypeId} in ST_ID ${showtimeId}. Updating...`, 'color: blue;');
            console.log(`  - Definition changed: ${definitionChanged}, Availability changed: ${availabilityChanged}`);
            console.log(`  - URL: PUT ${fullUpdateUrl}`);
            console.log(`  - PAYLOAD:`, fullUpdatePayload);

            const fullUpdateResponse = await fetch(fullUpdateUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullUpdatePayload),
            });

            if (!fullUpdateResponse.ok) {
                console.error(`[updateEvent] Failed to perform full update for ticket type ${ticketTypeDefinition.id} in showtime ${showtimeId}. Status: ${fullUpdateResponse.status}`, await fullUpdateResponse.text());
            }
        } else {
            console.log(`%c[updateEvent] Ticket details and availability for TT_ID ${ticketTypeId} in ST_ID ${showtimeId} have not changed. Skipping update.`, 'color: green;');
        }
    }
  }
  console.log(`%c[updateEvent] Intelligent update process complete for event ID: ${eventId}.`, 'color: #8833ff; font-weight: bold;');
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
  billing_address?: string | BillingAddress; // Not typically part of booking table, often separate
  booked_tickets?: RawApiBookedTicket[]; // For GET response if API embeds them
  bookedTickets?: RawApiBookedTicket[];  // Alternate naming
  event_slug?: string; // From event relationship
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
    // @ts-expect-error Property 'billing_street' does not exist on type 'RawApiBooking'.
    if (apiBooking.billing_street || apiBooking.billing_city) {
        parsedBillingAddress = {
            // @ts-expect-error Property 'billing_street' does not exist on type 'RawApiBooking'.
            street: apiBooking.billing_street || "",
            // @ts-expect-error Property 'billing_city' does not exist on type 'RawApiBooking'.
            city: apiBooking.billing_city || "",
            // @ts-expect-error Property 'billing_state' does not exist on type 'RawApiBooking'.
            state: apiBooking.billing_state || "",
            // @ts-expect-error Property 'billing_postal_code' does not exist on type 'RawApiBooking'.
            postalCode: apiBooking.billing_postal_code || "",
            // @ts-expect-error Property 'billing_country' does not exist on type 'RawApiBooking'
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
  
  // Ensure booked_tickets is an array, even if it's missing or not an array in the API response.
  // This makes the .map call safer.
  const rawBookedTicketsArray = Array.isArray(apiBooking.booked_tickets) 
      ? apiBooking.booked_tickets 
      : (Array.isArray(apiBooking.bookedTickets) ? apiBooking.bookedTickets : []);

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
    bookedTickets: rawBookedTicketsArray.map((bt: RawApiBookedTicket) => ({
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
async function updateAvailabilityForBookedItem(eventId: string, showTimeId: string, ticketTypeId: string, quantityBooked: number): Promise<void> {
  if (!API_BASE_URL || !TICKET_TYPES_AVAILABILITY_API_URL || !TICKET_TYPES_UPDATE_AVAILABILITY_API_URL) {
    console.error("[updateAvailability] An availability API URL is not defined.");
    return;
  }

  // 1. GET current availability
  const getUrl = `${TICKET_TYPES_AVAILABILITY_API_URL}/?eventid=${eventId}&showtimeid=${showTimeId}`;
  console.log(`[updateAvailability] Getting current availability. URL: GET ${getUrl}`);

  try {
    const getResponse = await fetch(getUrl);
    if (!getResponse.ok) {
      console.error(`Failed to GET current availability from ${getUrl}. Status: ${getResponse.status}`);
      return;
    }

    const availabilityData = await getResponse.json();
    if (!availabilityData.success || !Array.isArray(availabilityData.data)) {
      console.error('Invalid availability data structure received:', availabilityData);
      return;
    }

    // 2. Find the specific ticket type and calculate new availability
    const ticketInfo = availabilityData.data.find((t: { id: string }) => String(t.id) === String(ticketTypeId));
    if (!ticketInfo) {
      console.error(`Ticket type ${ticketTypeId} not found in availability response for showtime ${showTimeId}.`);
      return;
    }

    const currentAvailability = parseInt(ticketInfo.availability, 10);
    if (isNaN(currentAvailability)) {
      console.error(`Invalid current availability value for ticket ${ticketTypeId}:`, ticketInfo.availability);
      return;
    }

    const newAvailability = Math.max(0, currentAvailability - quantityBooked);

    // 3. PUT the new availability to the specified update URL.
    const putUrl = `${TICKET_TYPES_UPDATE_AVAILABILITY_API_URL}/?eventid=${eventId}&showtimeid=${showTimeId}&tickettypeid=${ticketTypeId}`;
    const putPayload = { availability: newAvailability };
    
    console.log(`[updateAvailability] Updating availability.`);
    console.log(`  - URL: PUT ${putUrl}`);
    console.log(`  - Payload:`, JSON.stringify(putPayload, null, 2));

    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload),
    });

    if (!putResponse.ok) {
      const errorBody = await putResponse.text();
      console.error(`Failed to PUT new availability for ticket ${ticketTypeId} to ${putUrl}. Status: ${putResponse.status}`, errorBody);
    } else {
      const successResponse = await putResponse.json();
      console.log(`Successfully updated availability for ticket ${ticketTypeId} to ${newAvailability}. Response:`, successResponse);
    }

  } catch (error) {
    console.error(`Error during availability update for ticket ${ticketTypeId}:`, error);
    if (error instanceof Error) {
        throw error; // Re-throw the error to be caught by the calling function if needed
    }
    throw new Error('An unexpected error occurred during availability update.');
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
  if (!eventNsidForLookup) {
    throw new Error("Event NSID (slug) missing from cart items for booking context.");
  }

  const event = await getEventBySlug(eventNsidForLookup);
  if (!event || !event.showTimes) {
    throw new Error("Event or its showtimes not found for booking context.");
  }
  
  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) {
    throw new Error("ShowTime ID is missing in booking data.");
  }
  
  const showTimeToUse = event.showTimes.find(st => st.id === showTimeId);
  if (!showTimeToUse) {
    throw new Error(`ShowTime with ID ${showTimeId} not found on event ${event.id}.`);
  }
  const showTimeDateTime = parseISO(showTimeToUse.dateTime);
  const firstTicketTypeName = bookingData.tickets.length > 0 ? bookingData.tickets[0].ticketTypeName : "N/A";

  // Step 1: Create main booking record
  const apiPayloadForBooking = {
    userId: bookingData.userId,
    eventId: bookingData.eventId,
    totalPrice: String(bookingData.totalPrice.toFixed(2)),
    bookingDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    eventName: event.name || "N/A",
    eventDate: format(showTimeDateTime, "yyyy-MM-dd HH:mm:ss"), 
    showtime: format(showTimeDateTime, "HH:mm:ss"), 
    tickettype: firstTicketTypeName,
    eventLocation: event.location || "N/A",
    qrCodeValue: `QR_BOOKING_${generateId()}`,
  };

  console.log("[createBooking] Sending payload to API /bookings:", JSON.stringify(apiPayloadForBooking, null, 2));

  let createdApiBooking: RawApiBooking;
  try {
    const response = await fetch(BOOKINGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayloadForBooking),
    });

    let bookingApiResponse: { message: string, booking: RawApiBooking };
    try {
      bookingApiResponse = await response.json();
    } catch (jsonError) {
      const responseText = await response.text().catch(() => "Could not read response body.");
      console.error(`[createBooking] Failed to parse JSON response from POST /bookings. Status: ${response.status}. Response text: ${responseText}`, jsonError);
      if (!response.ok) {
          throw new Error(`Booking creation attempt failed with status ${response.status}. API response: ${responseText.substring(0, 200)}`);
      }
      throw new Error(`Booking creation API responded with non-JSON. Status: ${response.status}.`);
    }
    
    console.log("[createBooking] Parsed API response from POST /bookings (bookingApiResponse):", JSON.stringify(bookingApiResponse, null, 2)); 

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (bookingApiResponse && typeof (bookingApiResponse as any).message === 'string') 
                       // eslint-disable-next-line @typescript-eslint/no-explicit-any
                       ? (bookingApiResponse as any).message 
                       : `API error ${response.status} during booking creation.`;
      console.error("API Error creating main booking record:", response.status, bookingApiResponse);
      throw new Error(errorMsg);
    }
    
    createdApiBooking = bookingApiResponse.booking;

    if (!createdApiBooking || createdApiBooking.id == null) {
        console.error("[createBooking] API did not return a valid booking ID for main booking. Response:", createdApiBooking);
        throw new Error("Main booking created, but API did not return a valid booking ID.");
    }

  } catch (error) {
    console.error("Network or other error creating main booking record:", error);
    throw error;
  }

  const mainBookingId = String(createdApiBooking.id);
  const createdBookedTicketLineItems: BookedTicket[] = [];

  // Step 2: Create booked_ticket line items
  if (mainBookingId && BOOKED_TICKETS_API_URL) {
    console.log(`[createBooking] Main booking ${mainBookingId} created. Now creating ${bookingData.tickets.length} booked_ticket line item(s)...`);
    for (const ticketItem of bookingData.tickets) {
      const apiPayloadForBookedTicket = {
        bookingId: mainBookingId,
        eventId: ticketItem.eventId,
        ticketTypeId: ticketItem.ticketTypeId,
        ticketTypeName: ticketItem.ticketTypeName,
        quantity: String(ticketItem.quantity),
        pricePerTicket: String(ticketItem.pricePerTicket.toFixed(2)),
        showTimeId: ticketItem.showTimeId,
      };
      try {
        console.log("[createBooking] Sending payload to API /booked-tickets:", JSON.stringify(apiPayloadForBookedTicket, null, 2));
        const lineItemResponse = await fetch(BOOKED_TICKETS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayloadForBookedTicket),
        });
        if (!lineItemResponse.ok) {
          const errorBody = await lineItemResponse.json().catch(() => ({ message: `Failed to create line item for ticket type ${ticketItem.ticketTypeId}` }));
          console.error(`API Error creating booked_ticket line item for TTypeID ${ticketItem.ticketTypeId}:`, lineItemResponse.status, errorBody);
        } else {
          const createdLineItem: RawApiBookedTicket = await lineItemResponse.json();
           createdBookedTicketLineItems.push({
            id: String(createdLineItem.id),
            bookingId: mainBookingId,
            ticketTypeId: String(createdLineItem.ticket_type_id || createdLineItem.ticketTypeId),
            ticketTypeName: createdLineItem.ticket_type_name || createdLineItem.ticketTypeName || ticketItem.ticketTypeName,
            showTimeId: String(createdLineItem.show_time_id || createdLineItem.showTimeId || ticketItem.showTimeId),
            quantity: parseInt(String(createdLineItem.quantity), 10) || 0,
            pricePerTicket: parseFloat(String(createdLineItem.price_per_ticket || createdLineItem.pricePerTicket)) || 0,
            eventNsid: ticketItem.eventNsid,
            createdAt: parseApiDateString(createdLineItem.created_at || createdLineItem.createdAt),
            updatedAt: parseApiDateString(createdLineItem.updated_at || createdLineItem.updatedAt),
          });
          console.log(`[createBooking] Successfully created booked_ticket line item for TTypeID ${ticketItem.ticketTypeId}. Response:`, createdLineItem);
        }
      } catch (lineItemError) {
        console.error(`Network or other error creating booked_ticket line item for TTypeID ${ticketItem.ticketTypeId}:`, lineItemError);
      }
    }
  }

  // Step 3: Update availabilities
  if (createdApiBooking && createdApiBooking.id) {
    console.log(`[createBooking] Booking ${mainBookingId} and line items processed. Now updating availabilities for ${bookingData.tickets.length} ticket item(s)...`);
    for (const ticketItem of bookingData.tickets) {
      try {
        await updateAvailabilityForBookedItem(ticketItem.eventId, ticketItem.showTimeId, ticketItem.ticketTypeId, ticketItem.quantity);
      } catch (availError) {
        console.error(`[createBooking] Failed to update availability for ticketType ${ticketItem.ticketTypeId} on showTime ${ticketItem.showTimeId} for booking ${mainBookingId}. Error:`, availError);
      }
    }
  }

  // Step 4: Construct and return final booking object
  const appBooking = transformApiBookingToAppBooking(createdApiBooking);
  appBooking.bookedTickets = createdBookedTicketLineItems;
  appBooking.billingAddress = bookingData.billingAddress; 
  return appBooking;
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  if (!id || id === "undefined" || id === "null" || typeof id !== 'string' || id.trim() === '') {
    console.warn(`[getBookingById] Attempt to fetch booking with invalid ID: "${id}". Aborting fetch.`);
    return undefined;
  }
  console.log(`Attempting to fetch main booking by ID: ${id} from: ${BOOKINGS_API_URL}/${id}`);
  try {
    const bookingResponse = await fetch(`${BOOKINGS_API_URL}/${id}`);
    if (!bookingResponse.ok) {
      if (bookingResponse.status === 404) {
        console.log(`Main booking with ID ${id} not found (404).`);
        return undefined;
      }
      const errorBodyText = await bookingResponse.text();
      console.error(`API Error fetching main booking ${id}: Status ${bookingResponse.status}, Body: ${errorBodyText}`);
      let errorJsonMessage = 'Failed to parse error JSON.';
      try {
        const errorJson = JSON.parse(errorBodyText);
        errorJsonMessage = errorJson.message || JSON.stringify(errorJson);
      } catch {}
      throw new Error(`Failed to fetch main booking ${id}: ${bookingResponse.status}. Message: ${errorJsonMessage}`);
    }
    const apiBooking: RawApiBooking = await bookingResponse.json();
    const mappedBooking = transformApiBookingToAppBooking(apiBooking);

    // Fetch associated booked tickets
    if (BOOKED_TICKETS_API_URL) {
      console.log(`Fetching booked_tickets for booking ID: ${id} from: ${BOOKED_TICKETS_API_URL}?bookingId=${id}`);
      const lineItemsResponse = await fetch(`${BOOKED_TICKETS_API_URL}?bookingId=${id}`);
      if (lineItemsResponse.ok) {
        const rawLineItems: RawApiBookedTicket[] = await lineItemsResponse.json();
        mappedBooking.bookedTickets = rawLineItems.map(bt => ({
          id: String(bt.id),
          bookingId: String(bt.booking_id || bt.bookingId || id),
          ticketTypeId: String(bt.ticket_type_id || bt.ticketTypeId),
          ticketTypeName: bt.ticket_type_name || bt.ticketTypeName || "N/A",
          showTimeId: String(bt.show_time_id || bt.showTimeId || 'unknown-showtime'),
          quantity: parseInt(String(bt.quantity), 10) || 0,
          pricePerTicket: parseFloat(String(bt.price_per_ticket || bt.pricePerTicket)) || 0,
          eventNsid: String(bt.event_nsid || mappedBooking.eventId), // Use main booking's eventId if specific not on line item
          createdAt: parseApiDateString(bt.created_at || bt.createdAt),
          updatedAt: parseApiDateString(bt.updated_at || bt.updatedAt),
        }));
      } else {
        console.warn(`Failed to fetch line items for booking ${id}: ${lineItemsResponse.status} - ${await lineItemsResponse.text()}`);
        mappedBooking.bookedTickets = []; // Ensure it's an empty array if fetch fails
      }
    } else {
      mappedBooking.bookedTickets = []; // Ensure it's an empty array if URL not set
    }

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

    const mappedBookingsPromises = apiBookings.map(async (bookingData) => {
      try {
        // We call getBookingById to fetch the main booking and its line items
        return getBookingById(String(bookingData.id));
      } catch (mapError) {
        console.error("Error mapping individual booking in adminGetAllBookings:", JSON.stringify(bookingData, null, 2), "Error:", mapError);
        return null;
      }
    });

    const resolvedBookings = (await Promise.all(mappedBookingsPromises)).filter(Boolean) as Booking[];
    console.log(`Successfully mapped ${resolvedBookings.length} bookings with line items.`);
    return resolvedBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

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
    
    const mappedBookingsPromises = apiBookings.map(async (bookingData) => {
        return getBookingById(String(bookingData.id)); // Re-use getBookingById to include line items
    });

    const resolvedBookings = (await Promise.all(mappedBookingsPromises)).filter(Boolean) as Booking[];
    return resolvedBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

  } catch (error) {
    console.error(`[getUserBookings] Network or other error fetching bookings for user ${userId}:`, error);
    return [];
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

// --- Dashboard Count Fetchers ---
export const getEventCount = async (): Promise<number> => {
  if (!EVENTS_COUNT_API_URL) return 0;
  try {
    const response = await fetch(EVENTS_COUNT_API_URL);
    if (!response.ok) throw new Error('Failed to fetch event count');
    const data = await response.json();
    return parseInt(data.totalEvents, 10) || 0;
  } catch (error) {
    console.error("Error fetching event count:", error);
    return 0; // Return a default value on error
  }
};

export const getBookingCount = async (): Promise<number> => {
  if (!BOOKINGS_COUNT_API_URL) return 0;
  try {
    const response = await fetch(BOOKINGS_COUNT_API_URL);
    if (!response.ok) throw new Error('Failed to fetch booking count');
    const data = await response.json();
    return parseInt(data.totalBookings, 10) || 0;
  } catch (error) {
    console.error("Error fetching booking count:", error);
    return 0;
  }
};

export const getUserCount = async (): Promise<number> => {
  if (!USERS_COUNT_API_URL) return 0;
  try {
    const response = await fetch(USERS_COUNT_API_URL);
    if (!response.ok) throw new Error('Failed to fetch user count');
    const data = await response.json();
    return parseInt(data.totalUsers, 10) || 0;
  } catch (error) {
    console.error("Error fetching user count:", error);
    return 0;
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


    const defaultEventDataList: CoreEventFormData[] = [
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
        }
    ];

    for (const eventData of defaultEventDataList) {
        try {
          await createEvent(eventData);
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

    





















    











