
import type { Event, Booking, TicketType, User, EventFormData, Organizer, OrganizerFormData } from './types';

const users: User[] = [
  { id: 'user1', email: 'test@example.com', name: 'Test User', isAdmin: false },
  { id: 'adminUser', email: 'admin@example.com', name: 'Admin User', isAdmin: true },
];

// Organizers Data - Ensure these are defined before mockEvents
let mockOrganizers: Organizer[] = [
  { id: 'org1', name: 'Tech Solutions Inc.', contactEmail: 'contact@techsolutions.com', website: 'https://techsolutions.com' },
  { id: 'org2', name: 'BeatDrop Productions', contactEmail: 'info@beatdrop.com', website: 'https://beatdrop.com' },
  { id: 'org3', name: 'The Art Collective', contactEmail: 'gallery@artcollective.org' },
  { id: 'org4', name: 'Starlight Foundation', contactEmail: 'give@starlight.org', website: 'https://starlight.org' },
  { id: 'org5', name: 'National Soccer League', contactEmail: 'fans@nsl.com', website: 'https://nsl.com' },
  { id: 'org6', name: 'Austin Community Theatre Group', contactEmail: 'act@communityplays.org' },
  { id: 'org7', name: 'Tomorrow Today Corp.', contactEmail: 'future@tt.corp', website: 'https://tt.corp/futurefest'}
];


const defaultTicketTypes: TicketType[] = [
    { id: 'default-standard', name: 'Standard Ticket', price: 50, availability: 100, description: 'General access.' },
    { id: 'default-vip', name: 'VIP Ticket', price: 150, availability: 20, description: 'VIP benefits included.' },
];

let ticketTypes: Record<string, TicketType[]> = {
  'tech-conference-2024': [
    { id: 'tc24-early', name: 'Early Bird', price: 199, availability: 50, description: 'Access to all talks and workshops, available for a limited time.' },
    { id: 'tc24-general', name: 'General Admission', price: 299, availability: 200, description: 'Full access to all conference events.' },
    { id: 'tc24-vip', name: 'VIP Pass', price: 499, availability: 20, description: 'Includes VIP lounge, special Q&A sessions, and a goodie bag.' },
  ],
  'summer-music-fest': [
    { id: 'smf-ga', name: 'General Admission', price: 75, availability: 1000, description: 'Access to all stages for one day.' },
    { id: 'smf-weekend', name: 'Weekend Pass', price: 180, availability: 500, description: 'Full weekend access.' },
    { id: 'smf-vip', name: 'VIP Experience', price: 350, availability: 100, description: 'VIP viewing areas, private bars, and premium restrooms.' },
  ],
  'art-exhibition-modern': [
    { id: 'art-adult', name: 'Adult', price: 25, availability: 300 },
    { id: 'art-student', name: 'Student', price: 15, availability: 100, description: 'Requires valid student ID.' },
  ],
  'charity-gala-night': [
    { id: 'gala-standard', name: 'Standard Ticket', price: 150, availability: 150 },
    { id: 'gala-table', name: 'Table of 8', price: 1000, availability: 10 },
  ],
  'sports-championship-final': [
    { id: 'sports-general', name: 'General Seating', price: 50, availability: 2000 },
    { id: 'sports-premium', name: 'Premium Seating', price: 120, availability: 500 },
  ],
   'local-theater-play': [
    { id: 'theater-standard', name: 'Standard Seat', price: 30, availability: 100 },
    { id: 'theater-balcony', name: 'Balcony Seat', price: 20, availability: 50 },
  ],
  'future-fest-2025': [
    { id: 'ff25-standard', name: 'Standard Pass', price: 99, availability: 500, description: 'General access to Future Fest.' },
    { id: 'ff25-early', name: 'Early Access', price: 79, availability: 100, description: 'Get in early!' },
  ],
};


export let mockEvents: Event[] = [
  {
    id: '1',
    slug: 'tech-conference-2024',
    name: 'Innovatech Conference 2024',
    date: '2024-09-15T09:00:00Z',
    location: 'Metro Convention Center, New York',
    description: 'Join industry leaders and innovators at the premier technology conference of the year. Explore cutting-edge advancements in AI, blockchain, and sustainable tech.',
    category: 'Technology',
    imageUrl: 'https://images.unsplash.com/photo-1472653816316-3ad6f10a6592?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxldmVudCUyMGNvbmNlcnR8ZW58MHx8fHwxNzQ4Nzc5ODQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[0], // Tech Solutions Inc.
    venue: { name: 'Metro Convention Center', address: '123 Innovation Drive, New York, NY', mapLink: '#' },
    ticketTypes: ticketTypes['tech-conference-2024'],
  },
  {
    id: '2',
    slug: 'summer-music-fest',
    name: 'Summer Music Fest 2024',
    date: '2024-07-20T14:00:00Z',
    location: 'Greenfield Park, Chicago',
    description: 'Experience three days of incredible live music from top artists across genres. Food trucks, art installations, and unforgettable vibes await!',
    category: 'Music',
    imageUrl: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxldmVudCUyMGNvbmNlcnR8ZW58MHx8fHwxNzQ4Nzc5ODQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[1], // BeatDrop Productions
    venue: { name: 'Greenfield Park', address: '456 Harmony Ave, Chicago, IL', mapLink: '#' },
    ticketTypes: ticketTypes['summer-music-fest'],
  },
  {
    id: '3',
    slug: 'art-exhibition-modern',
    name: 'Modern Masters Art Exhibition',
    date: '2024-10-05T10:00:00Z',
    location: 'City Art Gallery, San Francisco',
    description: 'A curated collection of masterpieces from the 20th and 21st centuries, showcasing pivotal movements in modern art.',
    category: 'Arts & Culture',
    imageUrl: 'https://images.unsplash.com/photo-1429514513361-8fa32282fd5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxldmVudCUyMGNvbmNlcnR8ZW58MHx8fHwxNzQ4Nzc5ODQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[2], // The Art Collective
    venue: { name: 'City Art Gallery', address: '789 Canvas St, San Francisco, CA', mapLink: '#' },
    ticketTypes: ticketTypes['art-exhibition-modern'],
  },
  {
    id: '4',
    slug: 'charity-gala-night',
    name: 'Starlight Charity Gala',
    date: '2024-11-16T18:00:00Z',
    location: 'The Grand Ballroom, Los Angeles',
    description: 'An elegant evening of dining, entertainment, and auctions to support children\'s education programs. Dress to impress!',
    category: 'Charity',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxldmVudCUyMGNvbmNlcnR8ZW58MHx8fHwxNzQ4Nzc5ODQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[3], // Starlight Foundation
    venue: { name: 'The Grand Ballroom', address: '101 Hope Rd, Los Angeles, CA', mapLink: '#' },
    ticketTypes: ticketTypes['charity-gala-night'],
  },
  {
    id: '5',
    slug: 'sports-championship-final',
    name: 'National Soccer Championship Final',
    date: '2024-08-25T19:00:00Z',
    location: 'Victory Stadium, Miami',
    description: 'Witness the thrilling conclusion to the national soccer league as the top two teams battle for the championship trophy.',
    category: 'Sports',
    imageUrl: 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8ZXZlbnQlMjBjb25jZXJ0fGVufDB8fHx8MTc0ODc3OTg0M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[4], // National Soccer League
    venue: { name: 'Victory Stadium', address: '202 Goal Line, Miami, FL', mapLink: '#' },
    ticketTypes: ticketTypes['sports-championship-final'],
  },
  {
    id: '6',
    slug: 'local-theater-play',
    name: 'A Midsummer Night\'s Dream',
    date: '2024-09-05T19:30:00Z',
    location: 'Community Playhouse, Austin',
    description: 'Enjoy Shakespeare\'s classic comedy brought to life by talented local actors in an intimate theater setting.',
    category: 'Theater',
    imageUrl: 'https://images.unsplash.com/photo-1522158637959-30385a09e0da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxldmVudCUyMGNvbmNlcnR8ZW58MHx8fHwxNzQ4Nzc5ODQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[5], // Austin Community Theatre Group
    venue: { name: 'Community Playhouse', address: '303 Stage Door, Austin, TX', mapLink: '#' },
    ticketTypes: ticketTypes['local-theater-play'],
  },
  {
    id: '7',
    slug: 'future-fest-2025',
    name: 'Future Fest 2025',
    date: '2025-12-01T10:00:00Z',
    location: 'Virtual Reality Arena, The Cloud',
    description: 'A glimpse into the events of tomorrow! Experience the future of entertainment, technology, and art.',
    category: 'Future',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxldmVudCUyMGNvbmNlcnR8ZW58MHx8fHwxNzQ4Nzc5ODQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    organizer: mockOrganizers[6], // Tomorrow Today Corp.
    venue: { name: 'VR Arena', address: '1 Cyberspace, Cloud City, CC', mapLink: '#' },
    ticketTypes: ticketTypes['future-fest-2025'],
  },
];

const mockBookings: Booking[] = [
  {
    id: 'booking-mock1-abcde',
    eventId: mockEvents[0].id,
    userId: users[0].id, // Test User
    tickets: [
      { eventNsid: mockEvents[0].slug, ticketTypeId: mockEvents[0].ticketTypes[0].id, ticketTypeName: mockEvents[0].ticketTypes[0].name, quantity: 1, pricePerTicket: mockEvents[0].ticketTypes[0].price },
    ],
    totalPrice: mockEvents[0].ticketTypes[0].price * 1,
    bookingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    eventName: mockEvents[0].name,
    eventDate: mockEvents[0].date,
    eventLocation: mockEvents[0].location,
    qrCodeValue: `EVENT:${mockEvents[0].name},BOOKING_ID:booking-mock1-abcde,DATE:${new Date(mockEvents[0].date).toLocaleDateString()}`,
  },
  {
    id: 'booking-mock2-fghij',
    eventId: mockEvents[1].id,
    userId: users[1].id, // Admin User
    tickets: [
      { eventNsid: mockEvents[1].slug, ticketTypeId: mockEvents[1].ticketTypes[0].id, ticketTypeName: mockEvents[1].ticketTypes[0].name, quantity: 2, pricePerTicket: mockEvents[1].ticketTypes[0].price },
      { eventNsid: mockEvents[1].slug, ticketTypeId: mockEvents[1].ticketTypes[1].id, ticketTypeName: mockEvents[1].ticketTypes[1].name, quantity: 1, pricePerTicket: mockEvents[1].ticketTypes[1].price },
    ],
    totalPrice: (mockEvents[1].ticketTypes[0].price * 2) + (mockEvents[1].ticketTypes[1].price * 1),
    bookingDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    eventName: mockEvents[1].name,
    eventDate: mockEvents[1].date,
    eventLocation: mockEvents[1].location,
    qrCodeValue: `EVENT:${mockEvents[1].name},BOOKING_ID:booking-mock2-fghij,DATE:${new Date(mockEvents[1].date).toLocaleDateString()}`,
  },
];


// Admin function to get all events
export const adminGetAllEvents = async (): Promise<Event[]> => {
  return mockEvents;
};

export const getEvents = async (): Promise<Event[]> => {
  return mockEvents;
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  return mockEvents.find(event => event.slug === slug);
};

export const getEventById = async (id: string): Promise<Event | undefined> => {
  return mockEvents.find(event => event.id === id);
};


export const createBooking = async (
  bookingData: Omit<Booking, 'id' | 'bookingDate' | 'qrCodeValue'> & { event: Event }
): Promise<Booking> => {
  const newBookingId = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const bookingDate = new Date().toISOString();
  
  const qrCodeValue = `EVENT:${bookingData.event.name},BOOKING_ID:${newBookingId},DATE:${new Date(bookingData.event.date).toLocaleDateString()}`;

  const newBooking: Booking = {
    ...bookingData,
    id: newBookingId,
    bookingDate,
    qrCodeValue,
    eventName: bookingData.event.name,
    eventDate: bookingData.event.date,
    eventLocation: bookingData.event.location,
  };
  mockBookings.push(newBooking);
  return newBooking;
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  return mockBookings.find(booking => booking.id === id);
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  // Return a copy and sort by booking date, newest first
  return [...mockBookings].sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
};


export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  return mockEvents
    .filter(event => new Date(event.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
};

export const getEventCategories = async (): Promise<string[]> => {
  const categories = new Set(mockEvents.map(event => event.category));
  return Array.from(categories);
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string, minPrice?: number, maxPrice?: number): Promise<Event[]> => {
  let filteredEvents = mockEvents;

  if (query) {
    filteredEvents = filteredEvents.filter(event =>
      event.name.toLowerCase().includes(query.toLowerCase()) ||
      event.description.toLowerCase().includes(query.toLowerCase())
    );
  }
  if (category) {
    filteredEvents = filteredEvents.filter(event => event.category === category);
  }
  if (date) {
    filteredEvents = filteredEvents.filter(event => event.date.startsWith(date));
  }
  if (location) {
    filteredEvents = filteredEvents.filter(event => event.location.toLowerCase().includes(location.toLowerCase()));
  }
  if (minPrice !== undefined) {
    filteredEvents = filteredEvents.filter(event => 
      event.ticketTypes.some(ticket => ticket.price >= minPrice!)
    );
  }
  if (maxPrice !== undefined) {
     filteredEvents = filteredEvents.filter(event => 
      event.ticketTypes.some(ticket => ticket.price <= maxPrice!)
    );
  }
  return filteredEvents;
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  return users.find(user => user.email === email);
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const newUser: User = { ...userData, id: `user-${Date.now()}` };
  users.push(newUser);
  return newUser;
};

// CRUD for Events
export const createEvent = async (data: EventFormData): Promise<Event> => {
  const newEventId = (mockEvents.length + 1).toString() + '-' + Date.now();
  
  const selectedOrganizer = await getOrganizerById(data.organizerId);
  if (!selectedOrganizer) {
    throw new Error(`Organizer with ID ${data.organizerId} not found.`);
  }

  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`; 
  let finalSlug = baseSlug;
  let counter = 1;
  while (mockEvents.some(e => e.slug === finalSlug && e.id !== newEventId)) { // Ensure slug is unique
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const newEvent: Event = {
    id: newEventId,
    name: data.name,
    slug: finalSlug,
    date: data.date.toISOString(),
    location: data.location,
    description: data.description || "<p></p>",
    category: data.category,
    imageUrl: data.imageUrl,
    organizer: selectedOrganizer, 
    venue: { name: data.venueName, address: data.venueAddress },
    ticketTypes: [...defaultTicketTypes.map(tt => ({...tt, id: `${finalSlug}-${tt.id.split('-')[1]}`}))], 
  };
  mockEvents.unshift(newEvent); 
  ticketTypes[finalSlug] = newEvent.ticketTypes; 
  return newEvent;
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const eventIndex = mockEvents.findIndex(event => event.id === eventId);
  if (eventIndex === -1) {
    return undefined;
  }

  const selectedOrganizer = await getOrganizerById(data.organizerId);
  if (!selectedOrganizer) {
    throw new Error(`Organizer with ID ${data.organizerId} not found.`);
  }

  const existingEvent = mockEvents[eventIndex];
  const updatedEvent: Event = JSON.parse(JSON.stringify(existingEvent)); 

  updatedEvent.name = data.name;
  
  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!finalNewSlug) finalNewSlug = existingEvent.slug; 

  if (finalNewSlug !== existingEvent.slug) {
      let baseSlugForUniqueness = finalNewSlug;
      let counter = 1;
      while (mockEvents.some(e => e.slug === finalNewSlug && e.id !== eventId)) {
          finalNewSlug = `${baseSlugForUniqueness}-${counter}`;
          counter++;
      }
  }
  updatedEvent.slug = finalNewSlug;
  updatedEvent.date = data.date.toISOString();
  updatedEvent.location = data.location;
  updatedEvent.description = data.description || "<p></p>";
  updatedEvent.category = data.category;
  updatedEvent.imageUrl = data.imageUrl;
  updatedEvent.organizer = selectedOrganizer; 
  updatedEvent.venue.name = data.venueName;
  updatedEvent.venue.address = data.venueAddress || ""; 

  if (finalNewSlug !== existingEvent.slug) {
    updatedEvent.ticketTypes = existingEvent.ticketTypes.map(tt => ({
        ...tt,
        id: tt.id.replace(existingEvent.slug, finalNewSlug) 
    }));
    delete ticketTypes[existingEvent.slug];
    ticketTypes[finalNewSlug] = updatedEvent.ticketTypes;
  } else {
     ticketTypes[finalNewSlug] = updatedEvent.ticketTypes;
  }
  
  mockEvents[eventIndex] = updatedEvent;
  return updatedEvent;
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
  const eventIndex = mockEvents.findIndex(event => event.id === eventId);
  if (eventIndex === -1) {
    return false;
  }
  const deletedEventSlug = mockEvents[eventIndex].slug;
  mockEvents.splice(eventIndex, 1);
  delete ticketTypes[deletedEventSlug]; 
  return true;
};

// CRUD for Organizers
export const adminGetAllOrganizers = async (): Promise<Organizer[]> => {
  return [...mockOrganizers].sort((a,b) => a.name.localeCompare(b.name));
};

export const getOrganizerById = async (id: string): Promise<Organizer | undefined> => {
  return mockOrganizers.find(org => org.id === id);
};

export const createOrganizer = async (data: OrganizerFormData): Promise<Organizer> => {
  const newOrganizer: Organizer = {
    id: `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: data.name,
    contactEmail: data.contactEmail,
    website: data.website || undefined,
  };
  mockOrganizers.push(newOrganizer);
  return newOrganizer;
};

export const updateOrganizer = async (organizerId: string, data: OrganizerFormData): Promise<Organizer | undefined> => {
  const organizerIndex = mockOrganizers.findIndex(org => org.id === organizerId);
  if (organizerIndex === -1) {
    return undefined;
  }
  const updatedOrganizer = {
    ...mockOrganizers[organizerIndex],
    ...data,
    website: data.website || undefined, 
  };
  mockOrganizers[organizerIndex] = updatedOrganizer;
  return updatedOrganizer;
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  const organizerIndex = mockOrganizers.findIndex(org => org.id === organizerId);
  if (organizerIndex === -1) {
    return false;
  }
  mockOrganizers.splice(organizerIndex, 1);
  return true;
};
