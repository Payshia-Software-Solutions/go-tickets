
import type { Event, Booking, User, Organizer, TicketType, ShowTime, ShowTimeTicketAvailability, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress, Category, CategoryFormData } from './types';
import { parse } from 'date-fns';

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
    venue: {
        name: apiEvent.venueName,
        address: apiEvent.venueAddress || null,
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

export const fetchPublicEventCategoriesFromApi = async (): Promise<string[]> => {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined");
  // This endpoint should return string array as per current public usage
  const url = `${API_BASE_URL}/events/categories`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("API Error fetching public categories:", response.status, await response.text());
      return [];
    }
    const categories: string[] = await response.json();
    // If the API now returns Category objects, map them to names here:
    // const categoryObjects: Category[] = await response.json();
    // return categoryObjects.map(cat => cat.name);
    return categories; // Assuming it still returns string[] for public side
  } catch (error) {
    console.error("Network error fetching public categories:", error);
    return [];
  }
};

// --- Adapter functions using the new API fetchers ---
export const getEvents = async (): Promise<Event[]> => {
  return fetchEventsFromApi();
};

export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
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

export const getEventCategories = async (): Promise<string[]> => {
  // This public function still returns string[]
  // It might fetch from a different public endpoint or use the adminGetAllCategories and map names.
  // For simplicity with mock data, let's use the admin list and map.
  // In a real API, this might be a separate, optimized public endpoint.
  const allCategoryObjects = await adminGetAllCategories(); // Uses mock adminGetAllCategories
  return allCategoryObjects.map(cat => cat.name).sort((a, b) => a.localeCompare(b));
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

  return fetchEventsFromApi(params);
};


// In-memory data stores
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

// --- Category Management (Mock - for admin operations) ---
let mockCategories: Category[] = [
  { id: generateId('cat'), name: "Music", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Sports", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Theater", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Festivals", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Comedy", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Exhibitions", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Technology", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Arts & Culture", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Charity", createdAt: new Date(), updatedAt: new Date() },
  { id: generateId('cat'), name: "Future", createdAt: new Date(), updatedAt: new Date() },
];

export const adminGetAllCategories = async (): Promise<Category[]> => {
  return [...mockCategories].sort((a, b) => a.name.localeCompare(b.name));
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  return mockCategories.find(cat => cat.id === id) || null;
};

export const createCategory = async (data: CategoryFormData): Promise<Category> => {
  if (mockCategories.some(c => c.name.toLowerCase() === data.name.toLowerCase())) {
    throw new Error("Category with this name already exists.");
  }
  const newCategory: Category = {
    id: generateId('cat'),
    name: data.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockCategories.push(newCategory);
  return newCategory;
};

export const updateCategory = async (categoryId: string, data: CategoryFormData): Promise<Category | null> => {
  const index = mockCategories.findIndex(cat => cat.id === categoryId);
  if (index === -1) return null;
  if (mockCategories.some(c => c.name.toLowerCase() === data.name.toLowerCase() && c.id !== categoryId)) {
    throw new Error("Another category with this name already exists.");
  }
  mockCategories[index] = {
    ...mockCategories[index],
    name: data.name,
    updatedAt: new Date(),
  };
  return mockCategories[index];
};

export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  const categoryToDelete = mockCategories.find(c => c.id === categoryId);
  if (!categoryToDelete) return false;

  // Check if category is in use by any event
  if (mockEventsStore.some(event => event.category.toLowerCase() === categoryToDelete.name.toLowerCase())) {
    throw new Error(`Cannot delete category "${categoryToDelete.name}": It is currently in use by one or more events.`);
  }
  const initialLength = mockCategories.length;
  mockCategories = mockCategories.filter(cat => cat.id !== categoryId);
  return mockCategories.length < initialLength;
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
  return [...mockEventsStore].sort((a,b) => (b.date && a.date) ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0);
};

export const getAdminEventById = async (id: string): Promise<Event | undefined> => {
  return mockEventsStore.find(event => event.id === id);
};


export const createEvent = async (data: EventFormData): Promise<Event> => {
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  // Ensure selected category name exists or add it (if dynamic category creation is allowed via event form)
  const categoryName = data.category.trim();
  let existingCategory = mockCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  if (!existingCategory && categoryName) {
      // If event form can create new categories on the fly
      // This part might be better handled by a dedicated category selection/creation UI in event form
      // For now, let's assume if it's not in the list, it's a new one.
      // This is a simplification; a robust system might require selecting from existing or explicit creation.
      console.warn(`Category "${categoryName}" not found, implicitly creating. Consider a dedicated category selection in EventForm.`);
      existingCategory = await createCategory({ name: categoryName }); // Uses mock createCategory
  }


  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`;
  let finalSlug = baseSlug;
  let counter = 1;
  while (mockEventsStore.some(e => e.slug === finalSlug)) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

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

  const newEvent: Event = {
    id: newEventId,
    name: data.name,
    slug: finalSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: existingCategory ? existingCategory.name : categoryName, // Use the managed category name
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
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const eventIndex = mockEventsStore.findIndex(e => e.id === eventId);
  if (eventIndex === -1) return undefined;

  const originalEvent = mockEventsStore[eventIndex];
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  const categoryName = data.category.trim();
  let existingCategory = mockCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
   if (!existingCategory && categoryName) {
      console.warn(`Category "${categoryName}" not found during update, implicitly creating. Consider a dedicated category selection in EventForm.`);
      existingCategory = await createCategory({ name: categoryName });
  }


  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!finalNewSlug) finalNewSlug = originalEvent.slug;
  if (finalNewSlug !== originalEvent.slug && mockEventsStore.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
    throw new Error("Slug already exists");
  }

  const updatedTicketTypes: TicketType[] = [];
  for (const ttData of data.ticketTypes) {
    const existingTt = originalEvent.ticketTypes?.find(ett => ett.id === ttData.id);
    updatedTicketTypes.push({
      id: existingTt?.id || generateId('tt'),
      eventId: eventId,
      name: ttData.name,
      price: ttData.price,
      availability: ttData.availability,
      description: ttData.description || null,
      createdAt: existingTt?.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  const updatedShowTimes: ShowTime[] = [];
  for (const stData of data.showTimes) {
    const existingSt = originalEvent.showTimes?.find(est => est.id === stData.id);
    const showTimeId = existingSt?.id || generateId('st');

    const ticketAvailabilities: ShowTimeTicketAvailability[] = [];
    for (const staData of stData.ticketAvailabilities) {
        const parentTicketType = updatedTicketTypes.find(tt => tt.id === staData.ticketTypeId);
        if (!parentTicketType) throw new Error(`Ticket type template with ID ${staData.ticketTypeId} not found.`);

        ticketAvailabilities.push({
            id: existingSt?.ticketAvailabilities.find(esta => esta.ticketTypeId === parentTicketType.id)?.id || generateId('sta'),
            showTimeId: showTimeId,
            ticketTypeId: parentTicketType.id,
            ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
            availableCount: staData.availableCount,
            createdAt: existingSt?.ticketAvailabilities.find(esta => esta.ticketTypeId === parentTicketType.id)?.createdAt || new Date(),
            updatedAt: new Date(),
        });
    }
    updatedShowTimes.push({
      id: showTimeId,
      eventId: eventId,
      dateTime: stData.dateTime.toISOString(),
      ticketAvailabilities,
      createdAt: existingSt?.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  mockEventsStore[eventIndex] = {
    ...originalEvent,
    name: data.name,
    slug: finalNewSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: existingCategory ? existingCategory.name : categoryName,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer,
    venue: {
        name: data.venueName,
        address: data.venueAddress || null,
    },
    ticketTypes: updatedTicketTypes,
    showTimes: updatedShowTimes,
    updatedAt: new Date(),
  };
  return mockEventsStore[eventIndex];
};


export const deleteEvent = async (eventId: string): Promise<boolean> => {
  if (mockBookings.some(booking => booking.eventId === eventId)) {
    throw new Error(`Cannot delete event: Bookings are associated. Please manage bookings first.`);
  }
  const initialLength = mockEventsStore.length;
  mockEventsStore = mockEventsStore.filter(event => event.id !== eventId);
  return mockEventsStore.length < initialLength;
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

  const event = mockEventsStore.find(e => e.id === bookingData.eventId);
  if (!event || !event.showTimes) throw new Error("Event or its showtimes not found for booking in mock store.");

  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");

  const showTimeIndex = event.showTimes.findIndex(st => st.id === showTimeId);
  if (showTimeIndex === -1) throw new Error(`ShowTime with ID ${showTimeId} not found for this event.`);
  const showTime = event.showTimes[showTimeIndex];

  for (const ticketItem of bookingData.tickets) {
    if (ticketItem.showTimeId !== showTimeId) {
        throw new Error("All tickets in a single booking must be for the same showtime.");
    }
    const staIndex = showTime.ticketAvailabilities.findIndex(sta => sta.ticketType.id === ticketItem.ticketTypeId);
    if (staIndex === -1) {
      throw new Error(`Availability record not found for ticket type ${ticketItem.ticketTypeName}.`);
    }
    if (showTime.ticketAvailabilities[staIndex].availableCount < ticketItem.quantity) {
      throw new Error(`Not enough tickets available for ${ticketItem.ticketTypeName}.`);
    }
    event.showTimes[showTimeIndex].ticketAvailabilities[staIndex].availableCount -= ticketItem.quantity;
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
    eventDate: new Date(showTime.dateTime).toISOString(),
    eventLocation: event.location,
    qrCodeValue: `EVENT:${event.slug},BOOKING_ID:${bookingId},SHOWTIME:${showTime.dateTime}`,
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

    const org1 = mockOrganizers.find(o => o.id === 'org-1') || mockOrganizers[0];

    const defaultEventDataList: EventFormData[] = [
        {
            name: "Admin Mock Music Fest 2025",
            slug: "admin-summer-music-fest-2025",
            date: new Date(new Date().getFullYear() + 1, 5, 15),
            location: "Grand Park, Downtown",
            description: "<p>Admin-managed music festival.</p>",
            category: "Festivals", // This must match a name in mockCategories
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
