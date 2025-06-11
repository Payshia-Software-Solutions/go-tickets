
import type { Event, Booking, User, Organizer, TicketType, ShowTime, ShowTimeTicketAvailability, EventFormData, OrganizerFormData, BookedTicketItem, BillingAddress } from './types';
import { format, parse } from 'date-fns';

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

const mapApiEventToAppEvent = (apiEvent: any): Event => {
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
    // These will be populated by the detail endpoint fetch
    organizer: apiEvent.organizer, 
    ticketTypes: apiEvent.ticketTypes,
    showTimes: apiEvent.showTimes?.map((st: any) => ({
      ...st,
      dateTime: parseApiDateString(st.dateTime) || new Date().toISOString(),
      ticketAvailabilities: st.ticketAvailabilities?.map((sta: any) => ({
        ...sta,
        ticketType: { // Assuming ticketType here is also simplified or needs mapping
          id: sta.ticketType?.id || sta.ticketTypeId,
          name: sta.ticketType?.name || 'N/A',
          price: sta.ticketType?.price || 0,
        }
      })) || [],
    })) || [],
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
      return []; // Return empty array on error
    }
    const apiEvents = await response.json();
    return apiEvents.map(mapApiEventToAppEvent);
  } catch (error) {
    console.error("Network error fetching events:", error);
    return [];
  }
};

export const fetchEventBySlugFromApi = async (slug: string): Promise<Event | null> => {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined");
  // Assuming the API supports fetching by slug like this:
  const url = `${API_BASE_URL}/events/slug/${slug}`; 
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`API Error fetching event by slug ${slug}:`, response.status, await response.text());
      return null;
    }
    const apiEvent = await response.json();
    // IMPORTANT: The detail endpoint MUST return the full structure including
    // nested organizer, ticketTypes, and showTimes with their availabilities.
    // mapApiEventToAppEvent will handle basic mapping, but ensure your API provides the rich data.
    return mapApiEventToAppEvent(apiEvent);
  } catch (error) {
    console.error(`Network error fetching event by slug ${slug}:`, error);
    return null;
  }
};

export const fetchEventCategoriesFromApi = async (): Promise<string[]> => {
  if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined");
  // Assuming an endpoint like /categories exists
  const url = `${API_BASE_URL}/categories`; 
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("API Error fetching categories:", response.status, await response.text());
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Network error fetching categories:", error);
    return [];
  }
};

// --- Adapter functions using the new API fetchers ---
export const getEvents = async (): Promise<Event[]> => {
  return fetchEventsFromApi();
};

export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  // The API would ideally support limiting and sorting.
  // For now, fetch all and slice.
  const allEvents = await fetchEventsFromApi();
  const now = new Date();
  return allEvents
    .filter(event => (event.date && new Date(event.date) >= now) || (event.showTimes?.some(st => new Date(st.dateTime) >= now)))
    .sort((a,b) => (a.date && b.date) ? new Date(a.date).getTime() - new Date(b.date).getTime() : 0)
    .slice(0, limit);
};

export const getPopularEvents = async (limit: number = 4): Promise<Event[]> => {
  // API should ideally have a way to determine "popular" events.
  // Mocking this by fetching all and taking first few for now.
  const allEvents = await fetchEventsFromApi();
   return allEvents
    .sort((a, b) => ((b.ticketTypes?.length || 0) + (b.showTimes?.length || 0)) - ((a.ticketTypes?.length || 0) + (a.showTimes?.length || 0))) // very naive popularity
    .slice(0, limit);
};

export const getEventCategories = async (): Promise<string[]> => {
  return fetchEventCategoriesFromApi();
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  const event = await fetchEventBySlugFromApi(slug);
  return event || undefined;
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string, minPrice?: number, maxPrice?: number): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (query) params.set('name_like', query); // Assuming API supports 'name_like' or similar for search
  if (category) params.set('category', category);
  if (date) params.set('date_gte', date); // Assuming API supports date filtering
  if (location) params.set('location_like', location); // Assuming API supports 'location_like'
  // Price filtering would also need API support (e.g., ticketTypes.price_gte, ticketTypes.price_lte)
  // This is simplified for now.
  
  return fetchEventsFromApi(params);
};


// In-memory data stores (will still be used by Admin functions until they are also refactored)
let mockUsers: User[] = [
  { id: 'user-1', email: 'admin@example.com', name: 'Admin User', isAdmin: true, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'user-2', email: 'customer@example.com', name: 'Regular Customer', isAdmin: false, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
let mockOrganizers: Organizer[] = [
  { id: 'org-1', name: 'Music Makers Inc.', contactEmail: 'contact@musicmakers.com', website: 'https://musicmakers.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-2', name: 'Tech Events Global', contactEmail: 'info@techevents.com', website: 'https://techevents.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
let mockEventsStore: Event[] = []; // Renamed to avoid conflict if we were to use actual API data here for admin too.
let mockBookings: Booking[] = [];

// Helper for unique IDs (still needed for mock admin operations)
const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;


// --- User Management (Mock - for admin/auth operations if not hitting API yet) ---
export const getUserByEmail = async (email: string): Promise<User | null> => {
  // TODO: Replace with API call if user management moves to API
  return mockUsers.find(user => user.email === email) || null;
};

export const createUser = async (userData: { email: string, name?: string, isAdmin?: boolean }): Promise<User> => {
  // TODO: Replace with API call
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
  // TODO: Replace with API call
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

// --- Organizer Management (Mock - for admin operations) ---
export const adminGetAllOrganizers = async (): Promise<Organizer[]> => {
  // TODO: Replace with API call: GET /admin/organizers (or similar)
  return [...mockOrganizers].sort((a,b) => a.name.localeCompare(b.name));
};

export const getOrganizerById = async (id: string): Promise<Organizer | null> => {
  // TODO: Replace with API call: GET /admin/organizers/{id}
  return mockOrganizers.find(org => org.id === id) || null;
};

export const createOrganizer = async (data: OrganizerFormData): Promise<Organizer> => {
  // TODO: Replace with API call: POST /admin/organizers
  const newOrganizer: Organizer = {
    id: generateId('org'),
    ...data,
    website: data.website || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockOrganizers.push(newOrganizer);
  return newOrganizer;
};

export const updateOrganizer = async (organizerId: string, data: OrganizerFormData): Promise<Organizer | null> => {
  // TODO: Replace with API call: PUT /admin/organizers/{id}
  const index = mockOrganizers.findIndex(org => org.id === organizerId);
  if (index === -1) return null;
  mockOrganizers[index] = {
    ...mockOrganizers[index],
    ...data,
    website: data.website || null,
    updatedAt: new Date().toISOString(),
  };
  return mockOrganizers[index];
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  // TODO: Replace with API call: DELETE /admin/organizers/{id}
  // This mock check is simplistic. Real API would handle relational integrity.
  if (mockEventsStore.some(event => event.organizerId === organizerId)) {
    throw new Error(`Cannot delete organizer: Events are linked.`);
  }
  const initialLength = mockOrganizers.length;
  mockOrganizers = mockOrganizers.filter(org => org.id !== organizerId);
  return mockOrganizers.length < initialLength;
};


// --- Event Management (Mock - for admin operations) ---
export const adminGetAllEvents = async (): Promise<Event[]> => {
  // This should fetch from an admin-specific API endpoint if your main /events is public
  // For now, uses the mock store.
  return [...mockEventsStore].sort((a,b) => (b.date && a.date) ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0);
};

export const getAdminEventById = async (id: string): Promise<Event | undefined> => {
  // This should fetch from an admin-specific API endpoint for full event data for editing
  return mockEventsStore.find(event => event.id === id);
};


export const createEvent = async (data: EventFormData): Promise<Event> => {
  // TODO: Replace with API call: POST /admin/events
  const organizer = await getOrganizerById(data.organizerId); // Still uses mock getOrganizerById
  if (!organizer) throw new Error("Organizer not found");

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
        const parentTicketType = ticketTypes.find(tt => tt.id === staData.ticketTypeId); 
        if (!parentTicketType) throw new Error(`Ticket type template with ID ${staData.ticketTypeId} not found for showtime.`);
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

  const newEvent: Event = {
    id: newEventId,
    name: data.name,
    slug: finalSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer, // Embedding for mock convenience
    venueName: data.venueName,
    venueAddress: data.venueAddress || null,
    ticketTypes,
    showTimes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockEventsStore.push(newEvent);
  return newEvent;
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  // TODO: Replace with API call: PUT /admin/events/{id}
  const eventIndex = mockEventsStore.findIndex(e => e.id === eventId);
  if (eventIndex === -1) return undefined;

  const originalEvent = mockEventsStore[eventIndex];
  const organizer = await getOrganizerById(data.organizerId); // Still uses mock
  if (!organizer) throw new Error("Organizer not found");

  // Slug uniqueness check (simplified for mock)
  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!finalNewSlug) finalNewSlug = originalEvent.slug;
  if (finalNewSlug !== originalEvent.slug && mockEventsStore.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
    throw new Error("Slug already exists");
  }

  // Manage Ticket Types
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
      createdAt: existingTt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
   // Simplified: assumes all ticket types from form are the definitive list.
   // Real API would handle deletions or merging more robustly.

  // Manage ShowTimes
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
            createdAt: existingSt?.ticketAvailabilities.find(esta => esta.ticketTypeId === parentTicketType.id)?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
    updatedShowTimes.push({
      id: showTimeId,
      eventId: eventId,
      dateTime: stData.dateTime.toISOString(),
      ticketAvailabilities,
      createdAt: existingSt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  mockEventsStore[eventIndex] = {
    ...originalEvent,
    name: data.name,
    slug: finalNewSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer, // Embed for mock convenience
    venueName: data.venueName,
    venueAddress: data.venueAddress || null,
    ticketTypes: updatedTicketTypes,
    showTimes: updatedShowTimes,
    updatedAt: new Date().toISOString(),
  };
  return mockEventsStore[eventIndex];
};


export const deleteEvent = async (eventId: string): Promise<boolean> => {
  // TODO: Replace with API call: DELETE /admin/events/{id}
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
  // TODO: Replace with API call: POST /bookings (or similar)
  const user = mockUsers.find(u => u.id === bookingData.userId);
  if (!user) throw new Error("User not found for booking.");
  
  // Note: For public event fetching, we use API. For admin creating event, we use mockEventsStore.
  // This booking creation should ideally use the same source of truth as what the user saw.
  // For now, it will try to find the event in mockEventsStore.
  // This could be inconsistent if mockEventsStore is not in sync with API.
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    totalPrice: bookingData.totalPrice,
    billingAddress: bookingData.billingAddress,
    bookingDate: new Date().toISOString(),
    eventName: event.name,
    eventDate: new Date(showTime.dateTime).toISOString(), 
    eventLocation: event.location,
    qrCodeValue: `EVENT:${event.slug},BOOKING_ID:${bookingId},SHOWTIME:${showTime.dateTime}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockBookings.push(newBooking);
  return newBooking;
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  // TODO: Replace with API call: GET /bookings/{id}
  return mockBookings.find(booking => booking.id === id);
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  // TODO: Replace with API call: GET /admin/bookings
  return [...mockBookings].sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
};


// Initialize mock data for admin if needed (not from API for this part)
const initAdminMockData = async () => {
    if (mockEventsStore.length > 0 && mockEventsStore.some(e => e.id === 'evt-predefined-1-admin')) return; 

    const org1 = mockOrganizers.find(o => o.id === 'org-1') || mockOrganizers[0];
    const org2 = mockOrganizers.find(o => o.id === 'org-2') || mockOrganizers[1];
    
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

        const createdEvent = await createEvent({ ...eventData, ticketTypes: finalTicketTypes, showTimes: finalShowTimes }); // Uses mock createEvent
        if(eventData.name.includes("Admin Mock Music Fest")) createdEvent.id = 'evt-predefined-1-admin';
    }
};

initAdminMockData(); // Initialize some admin-side mock events if the store is empty.
