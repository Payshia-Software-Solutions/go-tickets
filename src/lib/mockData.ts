
import type { Event, Booking, TicketType, User, EventFormData, Organizer, OrganizerFormData, BookedTicketItem } from './types';
import { prisma } from './db'; // Import Prisma client

// --- User Management ---
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (userData: Omit<User, 'id' | 'bookings' | 'isAdmin'> & { isAdmin?: boolean }): Promise<User> => {
  return prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      isAdmin: userData.isAdmin || false,
    },
  });
};

// --- Organizer Management ---
export const adminGetAllOrganizers = async (): Promise<Organizer[]> => {
  return prisma.organizer.findMany({
    orderBy: { name: 'asc' },
  });
};

export const getOrganizerById = async (id: string): Promise<Organizer | null> => {
  return prisma.organizer.findUnique({
    where: { id },
  });
};

export const createOrganizer = async (data: OrganizerFormData): Promise<Organizer> => {
  return prisma.organizer.create({
    data: {
      name: data.name,
      contactEmail: data.contactEmail,
      website: data.website || undefined,
    },
  });
};

export const updateOrganizer = async (organizerId: string, data: OrganizerFormData): Promise<Organizer | null> => {
  try {
    return await prisma.organizer.update({
      where: { id: organizerId },
      data: {
        name: data.name,
        contactEmail: data.contactEmail,
        website: data.website || undefined,
      },
    });
  } catch (error) {
    // Handle specific Prisma errors, e.g., P2025 (Record to update not found)
    console.error("Error updating organizer:", error);
    return null;
  }
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  try {
    // Before deleting an organizer, you might need to handle related events.
    // For example, disassociate them or prevent deletion if events exist.
    // This example directly attempts deletion.
    const eventsLinked = await prisma.event.count({ where: { organizerId }});
    if (eventsLinked > 0) {
      console.warn(`Cannot delete organizer ${organizerId}: ${eventsLinked} events are linked.`);
      // Optionally, throw an error or return a specific status
      // For now, returning false to indicate deletion failed due to links.
      // Or, you could update events to have a null organizerId if your schema allows.
      return false; 
    }

    await prisma.organizer.delete({
      where: { id: organizerId },
    });
    return true;
  } catch (error) {
    console.error("Error deleting organizer:", error);
    return false;
  }
};


// --- Event Management ---

// Helper to convert Prisma Event to application's Event type
function mapPrismaEventToAppEvent(prismaEvent: any): Event {
  return {
    ...prismaEvent,
    date: prismaEvent.date.toISOString(), // Convert Date to ISO string
    // Prisma's `ticketTypes` relation will be an array of PrismaTicketType.
    // We need to map them if the structure differs significantly or if we want to ensure our app's TicketType shape.
    // For this example, assuming the structure is similar enough or can be adapted.
    // If ticketTypes are stored as a JSON blob or handled differently, adjust here.
    ticketTypes: prismaEvent.ticketTypes.map((tt: any) => ({
      id: tt.id,
      name: tt.name,
      price: tt.price,
      availability: tt.availability,
      description: tt.description,
    })),
  };
}

const defaultTicketTypesSeed: Omit<TicketType, 'id' | 'eventId'>[] = [
    { name: 'Standard Ticket', price: 50, availability: 100, description: 'General access.' },
    { name: 'VIP Ticket', price: 150, availability: 20, description: 'VIP benefits included.' },
];


export const adminGetAllEvents = async (): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    include: { organizer: true, ticketTypes: true },
    orderBy: { date: 'desc' },
  });
  return prismaEvents.map(mapPrismaEventToAppEvent);
};

export const getEvents = async (): Promise<Event[]> => {
  // Similar to adminGetAllEvents, but could have different sorting/filtering for public view
  const prismaEvents = await prisma.event.findMany({
    include: { organizer: true, ticketTypes: true },
    orderBy: { date: 'asc' }, // Public view might prefer upcoming first
    where: { date: { gte: new Date() } } // Example: only show future events
  });
  return prismaEvents.map(mapPrismaEventToAppEvent);
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  const prismaEvent = await prisma.event.findUnique({
    where: { slug },
    include: { organizer: true, ticketTypes: true },
  });
  return prismaEvent ? mapPrismaEventToAppEvent(prismaEvent) : undefined;
};

export const getEventById = async (id: string): Promise<Event | undefined> => {
  const prismaEvent = await prisma.event.findUnique({
    where: { id },
    include: { organizer: true, ticketTypes: true },
  });
  return prismaEvent ? mapPrismaEventToAppEvent(prismaEvent) : undefined;
};

export const createEvent = async (data: EventFormData): Promise<Event> => {
  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`;
  
  let finalSlug = baseSlug;
  let counter = 1;
  // Check for slug uniqueness
  while (await prisma.event.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const createdEvent = await prisma.event.create({
    data: {
      name: data.name,
      slug: finalSlug,
      date: data.date, // Prisma expects DateTime
      location: data.location,
      description: data.description || "<p></p>",
      category: data.category,
      imageUrl: data.imageUrl,
      organizer: { connect: { id: data.organizerId } },
      venueName: data.venueName,
      venueAddress: data.venueAddress || null,
      // Create default ticket types for the new event
      ticketTypes: {
        create: defaultTicketTypesSeed.map(tt => ({
          name: tt.name,
          price: tt.price,
          availability: tt.availability,
          description: tt.description,
        })),
      },
    },
    include: { organizer: true, ticketTypes: true },
  });
  return mapPrismaEventToAppEvent(createdEvent);
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const existingEvent = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existingEvent) return undefined;

  let finalNewSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!finalNewSlug) finalNewSlug = existingEvent.slug;

  if (finalNewSlug !== existingEvent.slug) {
    let baseSlugForUniqueness = finalNewSlug;
    let counter = 1;
    while (await prisma.event.findUnique({ where: { slug: finalNewSlug, NOT: { id: eventId } } })) {
      finalNewSlug = `${baseSlugForUniqueness}-${counter}`;
      counter++;
    }
  }
  
  try {
    const updatedPrismaEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        name: data.name,
        slug: finalNewSlug,
        date: data.date,
        location: data.location,
        description: data.description || "<p></p>",
        category: data.category,
        imageUrl: data.imageUrl,
        organizer: { connect: { id: data.organizerId } },
        venueName: data.venueName,
        venueAddress: data.venueAddress || null,
        // Ticket types update logic would be more complex:
        // - Delete existing ones not in new set?
        // - Update existing ones?
        // - Create new ones?
        // For simplicity, this example doesn't modify ticket types on event update.
        // You would need a more sophisticated approach here for full CRUD on ticket types.
      },
      include: { organizer: true, ticketTypes: true },
    });
    return mapPrismaEventToAppEvent(updatedPrismaEvent);
  } catch (error) {
     console.error("Error updating event:", error);
     return undefined;
  }
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
  try {
    // Prisma will cascade delete related TicketTypes and Bookings if schema is set up for it.
    // Or handle manually:
    // await prisma.bookedTicket.deleteMany({ where: { booking: { eventId } } }); // If BookedTicket references eventId directly
    await prisma.booking.deleteMany({ where: { eventId }}); // Delete bookings first
    await prisma.ticketType.deleteMany({ where: { eventId } }); // Then ticket types
    await prisma.event.delete({ where: { id: eventId } });
    return true;
  } catch (error) {
    console.error("Error deleting event:", error);
    return false;
  }
};


// --- Booking Management ---
function mapPrismaBookingToAppBooking(prismaBooking: any): Booking {
  return {
    ...prismaBooking,
    bookingDate: prismaBooking.bookingDate.toISOString(),
    eventDate: prismaBooking.eventDate.toISOString(),
    // bookedTickets should already be in the correct format from Prisma include
  };
}


export const createBooking = async (
  bookingData: {
    eventId: string;
    userId: string;
    tickets: BookedTicketItem[]; // Use the defined type
    totalPrice: number;
    event: Pick<Event, 'name' | 'date' | 'location'>; // Only pick necessary event fields
  }
): Promise<Booking> => {
  const newBookingId = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const qrCodeValue = `EVENT:${bookingData.event.name},BOOKING_ID:${newBookingId},DATE:${new Date(bookingData.event.date).toLocaleDateString()}`;

  const createdBooking = await prisma.booking.create({
    data: {
      id: newBookingId, // Manually set if not using cuid() or uuid() as default for booking id
      user: { connect: { id: bookingData.userId } },
      event: { connect: { id: bookingData.eventId } },
      totalPrice: bookingData.totalPrice,
      eventName: bookingData.event.name,
      eventDate: new Date(bookingData.event.date), // Store as DateTime
      eventLocation: bookingData.event.location,
      qrCodeValue,
      bookedTickets: {
        create: bookingData.tickets.map(ticket => ({
          eventNsid: ticket.eventNsid,
          ticketTypeId: ticket.ticketTypeId, // This assumes ticketTypeId on BookedTicketItem is the actual ID from TicketType model.
          ticketTypeName: ticket.ticketTypeName,
          quantity: ticket.quantity,
          pricePerTicket: ticket.pricePerTicket,
        })),
      },
    },
    include: { user: true, event: true, bookedTickets: true },
  });
  return mapPrismaBookingToAppBooking(createdBooking);
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  const prismaBooking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true, event: true, bookedTickets: true },
  });
  return prismaBooking ? mapPrismaBookingToAppBooking(prismaBooking) : undefined;
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  const prismaBookings = await prisma.booking.findMany({
    include: { user: true, event: true, bookedTickets: true },
    orderBy: { bookingDate: 'desc' },
  });
  return prismaBookings.map(mapPrismaBookingToAppBooking);
};


// --- Public Event Queries ---
export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    where: { date: { gte: new Date() } }, // Events from now onwards
    orderBy: { date: 'asc' },
    take: limit,
    include: { organizer: true, ticketTypes: true },
  });
  return prismaEvents.map(mapPrismaEventToAppEvent);
};

export const getEventCategories = async (): Promise<string[]> => {
  const events = await prisma.event.findMany({
    select: { category: true },
    distinct: ['category'],
  });
  return events.map(event => event.category);
};

export const searchEvents = async (query?: string, category?: string, date?: string, location?: string, minPrice?: number, maxPrice?: number): Promise<Event[]> => {
  const whereClause: any = {
    AND: [],
  };

  if (query) {
    whereClause.AND.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    });
  }
  if (category) {
    whereClause.AND.push({ category: { equals: category, mode: 'insensitive' } });
  }
  if (date) {
    // Assumes date is in 'yyyy-MM-dd' format. Adjust parsing as needed.
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(startDate.getDate() + 1);
    whereClause.AND.push({ date: { gte: startDate, lt: endDate } });
  }
  if (location) {
    whereClause.AND.push({ location: { contains: location, mode: 'insensitive' } });
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    const ticketTypeConditions: any = {};
    if (minPrice !== undefined) ticketTypeConditions.gte = minPrice;
    if (maxPrice !== undefined) ticketTypeConditions.lte = maxPrice;
    whereClause.AND.push({ ticketTypes: { some: { price: ticketTypeConditions } } });
  }
  
  if (whereClause.AND.length === 0) delete whereClause.AND; // Remove if no conditions

  const prismaEvents = await prisma.event.findMany({
    where: whereClause,
    include: { organizer: true, ticketTypes: true },
    orderBy: { date: 'asc'},
  });
  return prismaEvents.map(mapPrismaEventToAppEvent);
};
