
import type { Event, Booking, User, Organizer, TicketType, ShowTime, ShowTimeTicketAvailability, EventFormData, OrganizerFormData, BookedTicketItem, TicketTypeFormData, ShowTimeFormData, BookedTicket } from './types';
import { format } from 'date-fns';

// In-memory data stores
let mockUsers: User[] = [
  { id: 'user-1', email: 'admin@example.com', name: 'Admin User', isAdmin: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'user-2', email: 'customer@example.com', name: 'Regular Customer', isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
];
let mockOrganizers: Organizer[] = [
  { id: 'org-1', name: 'Music Makers Inc.', contactEmail: 'contact@musicmakers.com', website: 'https://musicmakers.com', createdAt: new Date(), updatedAt: new Date() },
  { id: 'org-2', name: 'Tech Events Global', contactEmail: 'info@techevents.com', website: 'https://techevents.com', createdAt: new Date(), updatedAt: new Date() },
];
let mockEvents: Event[] = []; // Will be populated by createEvent or initialization logic
let mockBookings: Booking[] = [];

// Helper for unique IDs
const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- User Management ---
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockUsers.push(newUser);
  return newUser;
};

// --- Organizer Management ---
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
    website: data.website || undefined,
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
    website: data.website || undefined,
    updatedAt: new Date(),
  };
  return mockOrganizers[index];
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  if (mockEvents.some(event => event.organizerId === organizerId)) {
    throw new Error(`Cannot delete organizer: Events are linked.`);
  }
  const initialLength = mockOrganizers.length;
  mockOrganizers = mockOrganizers.filter(org => org.id !== organizerId);
  return mockOrganizers.length < initialLength;
};


// --- Event Management ---
export const adminGetAllEvents = async (): Promise<Event[]> => {
  return [...mockEvents].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getEventById = async (id: string): Promise<Event | undefined> => {
  return mockEvents.find(event => event.id === id);
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  return mockEvents.find(event => event.slug === slug);
};

export const createEvent = async (data: EventFormData): Promise<Event> => {
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`;
  let finalSlug = baseSlug;
  let counter = 1;
  while (mockEvents.some(e => e.slug === finalSlug)) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const newEventId = generateId('evt');

  const ticketTypes: TicketType[] = data.ticketTypes.map(ttData => ({
    id: ttData.id || generateId('tt'), // Use provided ID (temp client) or generate new
    eventId: newEventId,
    name: ttData.name,
    price: ttData.price,
    availability: ttData.availability,
    description: ttData.description || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const showTimes: ShowTime[] = data.showTimes.map(stData => {
    const showTimeId = stData.id || generateId('st');
    return {
      id: showTimeId,
      eventId: newEventId,
      dateTime: stData.dateTime.toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ticketAvailabilities: stData.ticketAvailabilities.map(staData => {
        const parentTicketType = ticketTypes.find(tt => tt.id === staData.ticketTypeId || tt.name === staData.ticketTypeName); // Match by ID or name for robustness with client temp IDs
        if (!parentTicketType) throw new Error(`Ticket type ${staData.ticketTypeName} not found for showtime.`);
        return {
          id: staData.id || generateId('sta'),
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
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer,
    venue: { name: data.venueName, address: data.venueAddress || undefined },
    ticketTypes,
    showTimes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockEvents.push(newEvent);
  return newEvent;
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const eventIndex = mockEvents.findIndex(e => e.id === eventId);
  if (eventIndex === -1) return undefined;

  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!finalNewSlug) finalNewSlug = mockEvents[eventIndex].slug;
  if (finalNewSlug !== mockEvents[eventIndex].slug) {
    let baseSlugForUniqueness = finalNewSlug;
    let counter = 1;
    while (mockEvents.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
      finalNewSlug = `${baseSlugForUniqueness}-${counter}`;
      counter++;
    }
  }

  // Manage Ticket Types
  const existingTicketTypes = mockEvents[eventIndex].ticketTypes;
  const updatedTicketTypes: TicketType[] = [];

  for (const ttData of data.ticketTypes) {
    if (ttData.id && existingTicketTypes.some(ett => ett.id === ttData.id)) { // Existing TT
      // Check for bookings before major changes if needed (simplified for mock)
      const existingTt = existingTicketTypes.find(ett => ett.id === ttData.id)!;
      updatedTicketTypes.push({
        ...existingTt,
        name: ttData.name,
        price: ttData.price,
        availability: ttData.availability,
        description: ttData.description || undefined,
        updatedAt: new Date(),
      });
    } else { // New TT
      updatedTicketTypes.push({
        id: ttData.id || generateId('tt'), // Use temp ID or generate
        eventId: eventId,
        name: ttData.name,
        price: ttData.price,
        availability: ttData.availability,
        description: ttData.description || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  // Filter out deleted TTs (those not in updatedTicketTypes by ID)
  // More complex: check if any showtime availability or booking refers to them.
  // For mock, we'll keep it simpler: if a TT is removed from form, it's removed if no bookings.
  const formTicketTypeIds = data.ticketTypes.map(ft => ft.id).filter(Boolean);
  const ticketTypesToDelete = existingTicketTypes.filter(ett => !formTicketTypeIds.includes(ett.id));
  for (const ttToDelete of ticketTypesToDelete) {
      const hasBookings = mockBookings.some(b => b.bookedTickets.some(bt => bt.ticketTypeId === ttToDelete.id));
      if (hasBookings) throw new Error(`Cannot delete ticket type "${ttToDelete.name}": It has existing bookings.`);
  }


  // Manage ShowTimes
  const existingShowTimes = mockEvents[eventIndex].showTimes;
  const updatedShowTimes: ShowTime[] = [];

  for (const stData of data.showTimes) {
    let currentShowTime: ShowTime;
    const existingSt = stData.id ? existingShowTimes.find(est => est.id === stData.id) : undefined;

    const ticketAvailabilities: ShowTimeTicketAvailability[] = [];
    for (const staData of stData.ticketAvailabilities) {
        const parentTicketType = updatedTicketTypes.find(tt => tt.id === staData.ticketTypeId || tt.name === staData.ticketTypeName);
        if (!parentTicketType) throw new Error(`Ticket type ${staData.ticketTypeName} template not found for showtime.`);
        
        const existingSta = existingSt?.ticketAvailabilities.find(esta => esta.ticketTypeId === parentTicketType.id);
        ticketAvailabilities.push({
            id: existingSta?.id || staData.id || generateId('sta'),
            showTimeId: existingSt?.id || stData.id || generateId('st-temp'), // Temp ID if showtime is new
            ticketTypeId: parentTicketType.id,
            ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
            availableCount: staData.availableCount,
            createdAt: existingSta?.createdAt || new Date(),
            updatedAt: new Date(),
        });
    }

    if (existingSt) {
      currentShowTime = {
        ...existingSt,
        dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities,
        updatedAt: new Date(),
      };
    } else {
      currentShowTime = {
        id: stData.id || generateId('st'),
        eventId: eventId,
        dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    updatedShowTimes.push(currentShowTime);
  }
  // Filter out deleted ShowTimes
  const formShowTimeIds = data.showTimes.map(fst => fst.id).filter(Boolean);
  const showTimesToDelete = existingShowTimes.filter(est => !formShowTimeIds.includes(est.id));
   for (const stToDelete of showTimesToDelete) {
      const hasBookings = mockBookings.some(b => b.bookedTickets.some(bt => bt.showTimeId === stToDelete.id));
      if (hasBookings) throw new Error(`Cannot delete showtime scheduled for ${new Date(stToDelete.dateTime).toLocaleString()}: It has existing bookings.`);
  }


  mockEvents[eventIndex] = {
    ...mockEvents[eventIndex],
    name: data.name,
    slug: finalNewSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer,
    venue: { name: data.venueName, address: data.venueAddress || undefined },
    ticketTypes: updatedTicketTypes,
    showTimes: updatedShowTimes,
    updatedAt: new Date(),
  };
  return mockEvents[eventIndex];
};


export const deleteEvent = async (eventId: string): Promise<boolean> => {
  if (mockBookings.some(booking => booking.eventId === eventId)) {
    throw new Error(`Cannot delete event: Bookings are associated. Please manage bookings first.`);
  }
  const initialLength = mockEvents.length;
  mockEvents = mockEvents.filter(event => event.id !== eventId);
  return mockEvents.length < initialLength;
};

// --- Booking Management ---
export const createBooking = async (
  bookingData: {
    eventId: string;
    userId: string;
    tickets: BookedTicketItem[];
    totalPrice: number;
    event: Pick<Event, 'name' | 'location' | 'slug'>;
  }
): Promise<Booking> => {
  const user = mockUsers.find(u => u.id === bookingData.userId);
  if (!user) throw new Error("User not found for booking.");
  const event = mockEvents.find(e => e.id === bookingData.eventId);
  if (!event) throw new Error("Event not found for booking.");

  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");
  
  const showTime = event.showTimes.find(st => st.id === showTimeId);
  if (!showTime) throw new Error(`ShowTime with ID ${showTimeId} not found for this event.`);

  // Check and decrement availability
  for (const ticketItem of bookingData.tickets) {
    if (ticketItem.showTimeId !== showTimeId) {
        throw new Error("All tickets in a single booking must be for the same showtime.");
    }
    const staIndex = showTime.ticketAvailabilities.findIndex(sta => sta.ticketTypeId === ticketItem.ticketTypeId);
    if (staIndex === -1) {
      throw new Error(`Availability record not found for ticket type ${ticketItem.ticketTypeName} at the selected showtime.`);
    }
    if (showTime.ticketAvailabilities[staIndex].availableCount < ticketItem.quantity) {
      throw new Error(`Not enough tickets available for ${ticketItem.ticketTypeName}. Requested: ${ticketItem.quantity}, Available: ${showTime.ticketAvailabilities[staIndex].availableCount}`);
    }
    showTime.ticketAvailabilities[staIndex].availableCount -= ticketItem.quantity;
  }
  
  const bookingId = generateId('bk');
  const newBooking: Booking = {
    id: bookingId,
    eventId: bookingData.eventId,
    userId: bookingData.userId,
    bookedTickets: bookingData.tickets.map(ticket => ({
      id: generateId('btk'),
      bookingId: bookingId,
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    totalPrice: bookingData.totalPrice,
    bookingDate: new Date().toISOString(),
    eventName: bookingData.event.name,
    eventDate: new Date(showTime.dateTime).toISOString(), // Specific showtime's date
    eventLocation: bookingData.event.location,
    qrCodeValue: `EVENT:${bookingData.event.slug},BOOKING_ID:${bookingId},SHOWTIME:${showTime.dateTime}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockBookings.push(newBooking);
  // Persist change to mockEvents (for availability)
  const eventIdx = mockEvents.findIndex(e => e.id === event.id);
  if(eventIdx > -1) mockEvents[eventIdx] = {...event};

  return newBooking;
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  return mockBookings.find(booking => booking.id === id);
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  return [...mockBookings].sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
};

// --- Public Event Queries ---
export const getEvents = async (): Promise<Event[]> => { // Public facing, should only show future events
  const now = new Date();
  return mockEvents
    .filter(event => new Date(event.date) >= now || event.showTimes.some(st => new Date(st.dateTime) >= now))
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  return getEvents().then(events => events.slice(0, limit));
};

export const getPopularEvents = async (limit: number = 4): Promise<Event[]> => {
  // For mock, popular is same as upcoming for simplicity
  return getUpcomingEvents(limit);
};


export const getEventCategories = async (): Promise<string[]> => {
  const categories = new Set<string>();
  mockEvents.forEach(event => categories.add(event.category));
  return Array.from(categories).sort();
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string, minPrice?: number, maxPrice?: number): Promise<Event[]> => {
  let filteredEvents = [...mockEvents];
  const now = new Date(new Date().setHours(0,0,0,0)); // Start of today

  // Default filter: show only events whose main date is today or in the future,
  // OR events that have at least one showtime today or in the future.
  filteredEvents = filteredEvents.filter(event => {
    const mainEventDate = new Date(event.date);
    mainEventDate.setHours(0,0,0,0);
    const hasFutureShowTime = event.showTimes.some(st => {
        const showDateTime = new Date(st.dateTime);
        showDateTime.setHours(0,0,0,0);
        return showDateTime >= now;
    });
    return mainEventDate >= now || hasFutureShowTime;
  });


  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredEvents = filteredEvents.filter(event =>
      event.name.toLowerCase().includes(lowerQuery) ||
      event.description.toLowerCase().includes(lowerQuery) ||
      event.location.toLowerCase().includes(lowerQuery) ||
      event.category.toLowerCase().includes(lowerQuery) ||
      event.organizer.name.toLowerCase().includes(lowerQuery) ||
      event.venue.name.toLowerCase().includes(lowerQuery)
    );
  }
  if (category) {
    filteredEvents = filteredEvents.filter(event => event.category.toLowerCase() === category.toLowerCase());
  }
  if (date) {
    const searchDate = format(new Date(date), "yyyy-MM-dd");
    filteredEvents = filteredEvents.filter(event => 
        format(new Date(event.date), "yyyy-MM-dd") === searchDate ||
        event.showTimes.some(st => format(new Date(st.dateTime), "yyyy-MM-dd") === searchDate)
    );
  }
  if (location) {
    const lowerLocation = location.toLowerCase();
    filteredEvents = filteredEvents.filter(event => event.location.toLowerCase().includes(lowerLocation));
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filteredEvents = filteredEvents.filter(event => {
      // Check price against any ticket type of any showtime
      return event.showTimes.some(st => 
        st.ticketAvailabilities.some(sta => {
            const price = sta.ticketType.price;
            const meetsMin = minPrice !== undefined ? price >= minPrice : true;
            const meetsMax = maxPrice !== undefined ? price <= maxPrice : true;
            return meetsMin && meetsMax;
        })
      ) || 
      // Fallback to main ticket types if no showtimes (older model)
      (!event.showTimes.length && event.ticketTypes.some(tt => {
            const price = tt.price;
            const meetsMin = minPrice !== undefined ? price >= minPrice : true;
            const meetsMax = maxPrice !== undefined ? price <= maxPrice : true;
            return meetsMin && meetsMax;
      }));
    });
  }
  return filteredEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Initialize with some default data
const initMockData = async () => {
    if (mockEvents.length > 0) return; // Already initialized

    const org1 = mockOrganizers[0]; // Music Makers Inc.
    const org2 = mockOrganizers[1]; // Tech Events Global

    const defaultEventData: EventFormData[] = [
        {
            name: "Summer Music Fest",
            slug: "summer-music-fest",
            date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
            location: "Grand Park, Downtown",
            description: "<p>Join us for the biggest music festival of the summer! Three days of non-stop music, food, and fun under the sun. Featuring top artists from around the globe.</p>",
            category: "Festivals",
            imageUrl: "https://placehold.co/800x450.png",
            organizerId: org1.id,
            venueName: "Grand Park Main Stage",
            venueAddress: "123 Park Ave, Downtown",
            ticketTypes: [
                { name: "General Admission", price: 75, availability: 500, description: "Access to all stages." },
                { name: "VIP Pass", price: 250, availability: 100, description: "VIP lounge, front stage access, free merch." }
            ],
            showTimes: [
                { dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000), // Day 1, 6 PM
                  ticketAvailabilities: [
                    { ticketTypeName: "General Admission", ticketTypeId: "temp-ga-fest", availableCount: 200 }, // temp IDs will be resolved
                    { ticketTypeName: "VIP Pass", ticketTypeId: "temp-vip-fest", availableCount: 50 }
                  ]
                },
                 { dateTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000), // Day 2, 6 PM
                  ticketAvailabilities: [
                    { ticketTypeName: "General Admission", ticketTypeId: "temp-ga-fest", availableCount: 150 },
                    { ticketTypeName: "VIP Pass", ticketTypeId: "temp-vip-fest", availableCount: 30 }
                  ]
                }
            ]
        },
        {
            name: "Future of AI Conference",
            slug: "future-of-ai-conf",
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            location: "Innovation Hub",
            description: "<p>Explore the cutting edge of Artificial Intelligence with leading researchers and industry pioneers. Keynotes, workshops, and networking opportunities.</p>",
            category: "Technology",
            imageUrl: "https://placehold.co/800x450.png",
            organizerId: org2.id,
            venueName: "Innovation Hall A",
            venueAddress: "456 Tech Drive",
            ticketTypes: [
                { name: "Standard Ticket", price: 199, availability: 300, description: "Full conference access." },
                { name: "Student Ticket", price: 99, availability: 100, description: "Requires valid student ID." }
            ],
            showTimes: [
                 { dateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Day 1, 9 AM
                  ticketAvailabilities: [
                    { ticketTypeName: "Standard Ticket", ticketTypeId: "temp-std-ai", availableCount: 150 },
                    { ticketTypeName: "Student Ticket", ticketTypeId: "temp-stu-ai", availableCount: 50 }
                  ]
                }
            ]
        }
    ];

    for (const eventData of defaultEventData) {
        // Assign temporary IDs to ticket types in form data for createEvent logic to map them
        const ttWithTempIds = eventData.ticketTypes.map(tt => ({...tt, id: generateId('client-tt')}));
        const stWithMappedTtIds = eventData.showTimes.map(st => ({
            ...st,
            id: generateId('client-st'),
            ticketAvailabilities: st.ticketAvailabilities.map(sta => {
                const matchedTt = ttWithTempIds.find(t => t.name === sta.ticketTypeName);
                return {...sta, ticketTypeId: matchedTt!.id!, id: generateId('client-sta') };
            })
        }));

        await createEvent({...eventData, ticketTypes: ttWithTempIds, showTimes: stWithMappedTtIds });
    }
};

initMockData(); // Initialize mock data when module loads

// Ensure this file exports all necessary functions and types for your app.
// Functions for admin panel, event display, booking, etc.
// Types from './types' are implicitly re-exported or used.
// The API routes will import these functions.
// Frontend pages (like search, event details) will also import these for now,
// but should ideally move to fetching from API routes if you want a strict client-server separation.
