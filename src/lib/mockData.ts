
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
let mockEvents: Event[] = []; 
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
    id: ttData.id && !ttData.id.startsWith('client-') ? ttData.id : generateId('tt'), // Use provided DB ID or generate new
    eventId: newEventId,
    name: ttData.name,
    price: ttData.price,
    availability: ttData.availability,
    description: ttData.description || undefined,
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
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer,
    venue: { name: data.venueName, address: data.venueAddress || undefined, mapLink: undefined },
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

  const originalEvent = mockEvents[eventIndex];
  const organizer = await getOrganizerById(data.organizerId);
  if (!organizer) throw new Error("Organizer not found");

  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!finalNewSlug) finalNewSlug = originalEvent.slug;
  if (finalNewSlug !== originalEvent.slug) {
    let baseSlugForUniqueness = finalNewSlug;
    let counter = 1;
    while (mockEvents.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
      finalNewSlug = `${baseSlugForUniqueness}-${counter}`;
      counter++;
    }
  }

  // Manage Ticket Types
  const updatedTicketTypes: TicketType[] = [];
  const formTicketTypeIds = data.ticketTypes.map(tt => tt.id);

  for (const ttData of data.ticketTypes) {
    const existingTt = originalEvent.ticketTypes.find(ett => ett.id === ttData.id);
    if (existingTt) { // Existing TT
      updatedTicketTypes.push({
        ...existingTt,
        name: ttData.name,
        price: ttData.price,
        availability: ttData.availability, // template availability
        description: ttData.description || undefined,
        updatedAt: new Date(),
      });
    } else { // New TT (client-side ID or no ID)
      updatedTicketTypes.push({
        id: generateId('tt'),
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
  // Check for deletions
  const ticketTypesToDelete = originalEvent.ticketTypes.filter(ett => !formTicketTypeIds.includes(ett.id));
  for (const ttToDelete of ticketTypesToDelete) {
      const hasBookings = mockBookings.some(b => b.bookedTickets.some(bt => bt.ticketTypeId === ttToDelete.id));
      if (hasBookings) throw new Error(`Cannot delete ticket type "${ttToDelete.name}": It has existing bookings.`);
  }
  const finalTicketTypes = updatedTicketTypes.filter(tt => !ticketTypesToDelete.find(del => del.id === tt.id));


  // Manage ShowTimes
  const updatedShowTimes: ShowTime[] = [];
  const formShowTimeIds = data.showTimes.map(st => st.id);

  for (const stData of data.showTimes) {
    const existingSt = originalEvent.showTimes.find(est => est.id === stData.id);
    const showTimeId = existingSt ? existingSt.id : generateId('st');
    
    const ticketAvailabilities: ShowTimeTicketAvailability[] = [];
    for (const staData of stData.ticketAvailabilities) {
        const parentTicketType = finalTicketTypes.find(tt => tt.id === staData.ticketTypeId);
        if (!parentTicketType) throw new Error(`Ticket type template with ID ${staData.ticketTypeId} not found for showtime. It might have been removed.`);
        
        const existingSta = existingSt?.ticketAvailabilities.find(esta => esta.ticketTypeId === parentTicketType.id);
        ticketAvailabilities.push({
            id: existingSta?.id || generateId('sta'),
            showTimeId: showTimeId,
            ticketTypeId: parentTicketType.id,
            ticketType: { id: parentTicketType.id, name: parentTicketType.name, price: parentTicketType.price },
            availableCount: staData.availableCount,
            createdAt: existingSta?.createdAt || new Date(),
            updatedAt: new Date(),
        });
    }

    if (existingSt) {
      updatedShowTimes.push({
        ...existingSt,
        dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities,
        updatedAt: new Date(),
      });
    } else {
      updatedShowTimes.push({
        id: showTimeId,
        eventId: eventId,
        dateTime: stData.dateTime.toISOString(),
        ticketAvailabilities,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  // Check for deleted ShowTimes
  const showTimesToDelete = originalEvent.showTimes.filter(est => !formShowTimeIds.includes(est.id));
   for (const stToDelete of showTimesToDelete) {
      const hasBookings = mockBookings.some(b => b.bookedTickets.some(bt => bt.showTimeId === stToDelete.id));
      if (hasBookings) throw new Error(`Cannot delete showtime scheduled for ${new Date(stToDelete.dateTime).toLocaleString()}: It has existing bookings.`);
  }
  const finalShowTimes = updatedShowTimes.filter(st => !showTimesToDelete.find(del => del.id === st.id));


  mockEvents[eventIndex] = {
    ...originalEvent,
    name: data.name,
    slug: finalNewSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description,
    category: data.category,
    imageUrl: data.imageUrl,
    organizerId: data.organizerId,
    organizer: organizer,
    venue: { ...originalEvent.venue, name: data.venueName, address: data.venueAddress || undefined },
    ticketTypes: finalTicketTypes,
    showTimes: finalShowTimes,
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
    tickets: BookedTicketItem[]; // These now include showTimeId
    totalPrice: number;
    // event: Pick<Event, 'name' | 'location' | 'slug'>; // This is not needed if we fetch event by eventId
  }
): Promise<Booking> => {
  const user = mockUsers.find(u => u.id === bookingData.userId);
  if (!user) throw new Error("User not found for booking.");
  
  const event = mockEvents.find(e => e.id === bookingData.eventId);
  if (!event) throw new Error("Event not found for booking.");

  // All tickets in a single booking must be for the same showtime.
  // Take the showTimeId from the first ticket item.
  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) throw new Error("ShowTime ID is missing in booking data.");
  
  const showTime = event.showTimes.find(st => st.id === showTimeId);
  if (!showTime) throw new Error(`ShowTime with ID ${showTimeId} not found for this event.`);

  // Check and decrement availability for each ticket item against the selected showTime
  for (const ticketItem of bookingData.tickets) {
    if (ticketItem.showTimeId !== showTimeId) {
        throw new Error("All tickets in a single booking must be for the same showtime. This is a system constraint.");
    }
    const staIndex = showTime.ticketAvailabilities.findIndex(sta => sta.ticketType.id === ticketItem.ticketTypeId);
    if (staIndex === -1) {
      throw new Error(`Availability record not found for ticket type ${ticketItem.ticketTypeName} at showtime ${new Date(showTime.dateTime).toLocaleString()}.`);
    }
    if (showTime.ticketAvailabilities[staIndex].availableCount < ticketItem.quantity) {
      throw new Error(`Not enough tickets available for ${ticketItem.ticketTypeName} for showtime ${new Date(showTime.dateTime).toLocaleString()}. Requested: ${ticketItem.quantity}, Available: ${showTime.ticketAvailabilities[staIndex].availableCount}`);
    }
    // Decrement in the mock data
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
      eventNsid: event.slug, // Use event's slug
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketTypeName,
      quantity: ticket.quantity,
      pricePerTicket: ticket.pricePerTicket,
      showTimeId: ticket.showTimeId, // Store showTimeId
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    totalPrice: bookingData.totalPrice,
    bookingDate: new Date().toISOString(),
    eventName: event.name,
    eventDate: new Date(showTime.dateTime).toISOString(), // Date of the specific showtime
    eventLocation: event.location,
    qrCodeValue: `EVENT:${event.slug},BOOKING_ID:${bookingId},SHOWTIME:${showTime.dateTime}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockBookings.push(newBooking);

  // Persist change to mockEvents (for availability counts on the specific showtime)
  const eventIdx = mockEvents.findIndex(e => e.id === event.id);
  if(eventIdx > -1) {
      const showTimeIdx = mockEvents[eventIdx].showTimes.findIndex(st => st.id === showTimeId);
      if (showTimeIdx > -1) {
          mockEvents[eventIdx].showTimes[showTimeIdx] = {...showTime};
      }
  }

  return newBooking;
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  return mockBookings.find(booking => booking.id === id);
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  return [...mockBookings].sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
};

// --- Public Event Queries ---
export const getEvents = async (): Promise<Event[]> => { 
  const now = new Date();
  return mockEvents
    .filter(event => new Date(event.date) >= now || event.showTimes.some(st => new Date(st.dateTime) >= now))
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  return getEvents().then(events => events.slice(0, limit));
};

export const getPopularEvents = async (limit: number = 4): Promise<Event[]> => {
  // Mock: Sort by number of ticket types (as a proxy for popularity) then take upcoming.
  // A real implementation would use booking counts or other metrics.
  const allUpcoming = await getEvents();
  return allUpcoming
    .sort((a, b) => (b.ticketTypes?.length || 0) - (a.ticketTypes?.length || 0))
    .slice(0, limit);
};


export const getEventCategories = async (): Promise<string[]> => {
  const categories = new Set<string>();
  mockEvents.forEach(event => categories.add(event.category));
  return Array.from(categories).sort();
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string, minPrice?: number, maxPrice?: number): Promise<Event[]> => {
  let filteredEvents = [...mockEvents];
  const now = new Date(new Date().setHours(0,0,0,0)); 

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
      (event.description && event.description.toLowerCase().includes(lowerQuery)) ||
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
      return event.showTimes.some(st => 
        st.ticketAvailabilities.some(sta => {
            const price = sta.ticketType.price;
            const meetsMin = minPrice !== undefined ? price >= minPrice : true;
            const meetsMax = maxPrice !== undefined ? price <= maxPrice : true;
            return meetsMin && meetsMax;
        })
      ) || 
      (!event.showTimes.length && event.ticketTypes.some(tt => { // Fallback for events somehow without showtimes
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
    if (mockEvents.length > 0 && mockEvents.some(e => e.id === 'evt-predefined-1')) return; 

    const org1 = mockOrganizers.find(o => o.id === 'org-1') || mockOrganizers[0];
    const org2 = mockOrganizers.find(o => o.id === 'org-2') || mockOrganizers[1];
    
    mockEvents = mockEvents.filter(e => !e.id.startsWith('evt-predefined-'));


    const defaultEventDataList: EventFormData[] = [
        {
            name: "Summer Music Fest 2025",
            slug: "summer-music-fest-2025",
            date: new Date(new Date().getFullYear() + 1, 5, 15), // June 15th next year
            location: "Grand Park, Downtown",
            description: "<p>Join us for the biggest music festival of the summer! Three days of non-stop music, food, and fun under the sun. Featuring top artists from around the globe.</p>",
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
                { id: generateId('st'), dateTime: new Date(new Date().getFullYear() + 1, 5, 15, 18, 0), // Day 1, 6 PM
                  ticketAvailabilities: [
                    { ticketTypeId: "NEEDS_REPLACEMENT_GA", ticketTypeName: "General Admission", availableCount: 200 },
                    { ticketTypeId: "NEEDS_REPLACEMENT_VIP", ticketTypeName: "VIP Pass", availableCount: 50 }
                  ]
                },
                 { id: generateId('st'), dateTime: new Date(new Date().getFullYear() + 1, 5, 16, 18, 0), // Day 2, 6 PM
                  ticketAvailabilities: [
                    { ticketTypeId: "NEEDS_REPLACEMENT_GA", ticketTypeName: "General Admission", availableCount: 150 },
                    { ticketTypeId: "NEEDS_REPLACEMENT_VIP", ticketTypeName: "VIP Pass", availableCount: 30 }
                  ]
                }
            ]
        },
        {
            name: "Future of AI Conference 2025",
            slug: "future-of-ai-conf-2025",
            date: new Date(new Date().getFullYear() + 1, 7, 20), // Aug 20th next year
            location: "Innovation Hub",
            description: "<p>Explore the cutting edge of Artificial Intelligence with leading researchers and industry pioneers. Keynotes, workshops, and networking opportunities.</p>",
            category: "Technology",
            imageUrl: "https://placehold.co/800x450.png",
            organizerId: org2.id,
            venueName: "Innovation Hall A",
            venueAddress: "456 Tech Drive",
            ticketTypes: [
                { id: generateId('tt'), name: "Standard Ticket", price: 199, availability: 300, description: "Full conference access." },
                { id: generateId('tt'), name: "Student Ticket", price: 99, availability: 100, description: "Requires valid student ID." }
            ],
            showTimes: [
                 { id: generateId('st'), dateTime: new Date(new Date().getFullYear() + 1, 7, 20, 9, 0), // Day 1, 9 AM
                  ticketAvailabilities: [
                    { ticketTypeId: "NEEDS_REPLACEMENT_STD", ticketTypeName: "Standard Ticket", availableCount: 150 },
                    { ticketTypeId: "NEEDS_REPLACEMENT_STU", ticketTypeName: "Student Ticket", availableCount: 50 }
                  ]
                }
            ]
        }
    ];

    for (const eventData of defaultEventDataList) {
        // Correctly map ticketTypeId for showTime.ticketAvailabilities using the IDs from eventData.ticketTypes
        const finalTicketTypes = eventData.ticketTypes; // these now have IDs
        const finalShowTimes = eventData.showTimes.map(st => {
            const newTicketAvailabilities = st.ticketAvailabilities.map(sta => {
                const parentTicketType = finalTicketTypes.find(tt => tt.name === sta.ticketTypeName);
                if (!parentTicketType || !parentTicketType.id) {
                    console.error(`Error in mock data: Could not find parent ticket type for ${sta.ticketTypeName}`);
                    return { ...sta, ticketTypeId: 'error-tt-id' }; // Fallback
                }
                return { ...sta, ticketTypeId: parentTicketType.id };
            });
            return { ...st, ticketAvailabilities: newTicketAvailabilities };
        });

        // Use a predefined ID for easier testing if needed, or let createEvent generate one
        // For this example, let createEvent handle ID generation to avoid clashes
        const createdEvent = await createEvent({ ...eventData, ticketTypes: finalTicketTypes, showTimes: finalShowTimes });
        if(eventData.name.includes("Summer Music Fest")) createdEvent.id = 'evt-predefined-1';
        if(eventData.name.includes("Future of AI")) createdEvent.id = 'evt-predefined-2';
    }
};

initMockData();
