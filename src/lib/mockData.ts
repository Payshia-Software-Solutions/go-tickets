
import type { Event, Booking, User, EventFormData, Organizer, OrganizerFormData, BookedTicketItem, TicketTypeFormData } from './types';
import { prisma } from './db'; // Import Prisma client
import type { Event as PrismaEvent, Organizer as PrismaOrganizer, User as PrismaUser, Booking as PrismaBooking, TicketType as PrismaTicketType, BookedTicket as PrismaBookedTicket } from '@prisma/client';

// --- User Management ---
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (userData: Omit<User, 'id' | 'isAdmin'> & { isAdmin?: boolean }): Promise<User> => {
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
    const eventsLinked = await prisma.event.count({ where: { organizerId }});
    if (eventsLinked > 0) {
      console.warn(`Cannot delete organizer ${organizerId}: ${eventsLinked} events are linked.`);
      // Consider more robust error throwing or handling here
      throw new Error(`Cannot delete organizer: ${eventsLinked} events are linked.`);
    }

    await prisma.organizer.delete({
      where: { id: organizerId },
    });
    return true;
  } catch (error) {
    console.error("Error deleting organizer:", error);
    if (error instanceof Error && error.message.includes("Cannot delete organizer")) {
        throw error; // Re-throw specific error for frontend to catch
    }
    throw new Error("Could not delete organizer due to an unexpected error.");
  }
};


// --- Event Management ---

// Helper to convert Prisma Event to application's Event type
type PrismaEventWithRelations = PrismaEvent & {
  organizer: PrismaOrganizer;
  ticketTypes: PrismaTicketType[];
};

function mapPrismaEventToAppEvent(prismaEvent: PrismaEventWithRelations): Event {
  return {
    id: prismaEvent.id,
    name: prismaEvent.name,
    slug: prismaEvent.slug,
    date: prismaEvent.date.toISOString(),
    location: prismaEvent.location,
    description: prismaEvent.description || "", // Ensure description is always string
    category: prismaEvent.category,
    imageUrl: prismaEvent.imageUrl,
    organizer: {
      id: prismaEvent.organizer.id,
      name: prismaEvent.organizer.name,
      contactEmail: prismaEvent.organizer.contactEmail,
      website: prismaEvent.organizer.website || undefined,
    },
    ticketTypes: prismaEvent.ticketTypes.map((tt: PrismaTicketType) => ({
      id: tt.id,
      name: tt.name,
      price: tt.price,
      availability: tt.availability,
      description: tt.description || undefined,
    })),
    venue: { 
        name: prismaEvent.venueName,
        address: prismaEvent.venueAddress || undefined,
    }
  };
}

export const adminGetAllEvents = async (): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    include: { organizer: true, ticketTypes: true },
    orderBy: { date: 'desc' },
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventWithRelations));
};

export const getEvents = async (): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    include: { organizer: true, ticketTypes: true },
    orderBy: { date: 'asc' },
    where: { date: { gte: new Date() } }
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventWithRelations));
};

export const getPopularEvents = async (limit: number = 4): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    orderBy: { date: 'asc' }, 
    take: limit,
    include: { organizer: true, ticketTypes: true },
    where: { date: { gte: new Date() } }
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventWithRelations));
};


export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  const prismaEvent = await prisma.event.findUnique({
    where: { slug },
    include: { organizer: true, ticketTypes: true },
  });
  return prismaEvent ? mapPrismaEventToAppEvent(prismaEvent as PrismaEventWithRelations) : undefined;
};

export const getEventById = async (id: string): Promise<Event | undefined> => {
  const prismaEvent = await prisma.event.findUnique({
    where: { id },
    include: { organizer: true, ticketTypes: true },
  });
  return prismaEvent ? mapPrismaEventToAppEvent(prismaEvent as PrismaEventWithRelations) : undefined;
};

export const createEvent = async (data: EventFormData): Promise<Event> => {
  let baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  if (!baseSlug) baseSlug = `event-${Date.now()}`;

  let finalSlug = baseSlug;
  let counter = 1;
  while (await prisma.event.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const createdEvent = await prisma.event.create({
    data: {
      name: data.name,
      slug: finalSlug,
      date: data.date,
      location: data.location,
      description: data.description || "<p></p>",
      category: data.category,
      imageUrl: data.imageUrl,
      organizer: { connect: { id: data.organizerId } },
      venueName: data.venueName,
      venueAddress: data.venueAddress || null,
      ticketTypes: {
        create: data.ticketTypes.map(tt => ({
          name: tt.name,
          price: tt.price,
          availability: tt.availability,
          description: tt.description,
        })),
      },
    },
    include: { organizer: true, ticketTypes: true },
  });
  return mapPrismaEventToAppEvent(createdEvent as PrismaEventWithRelations);
};

export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const existingEvent = await prisma.event.findUnique({ 
    where: { id: eventId },
    include: { ticketTypes: true } 
  });
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
    const updatedPrismaEvent = await prisma.$transaction(async (tx) => {
      // 1. Update main event properties
      const eventUpdate = await tx.event.update({
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
        }
      });

      // 2. Manage Ticket Types
      const existingTicketTypeIds = existingEvent.ticketTypes.map(tt => tt.id);
      const formTicketTypeIds = data.ticketTypes.filter(tt => tt.id).map(tt => tt.id as string);

      // Ticket types to delete: in DB but not in form
      const ticketTypesToDelete = existingTicketTypeIds.filter(id => !formTicketTypeIds.includes(id));
      if (ticketTypesToDelete.length > 0) {
        // Before deleting, check if any bookings are associated with these ticket types for this event
        const bookingsExist = await tx.bookedTicket.count({
          where: {
            ticketTypeId: { in: ticketTypesToDelete },
            booking: { eventId: eventId } // Assuming BookedTicket is related to Booking which is related to Event
          }
        });
        if (bookingsExist > 0) {
          throw new Error("Cannot delete ticket type(s) with existing bookings. Please manage bookings first.");
        }
        await tx.ticketType.deleteMany({
          where: { id: { in: ticketTypesToDelete }, eventId: eventId },
        });
      }

      // Ticket types to update or create
      for (const ttData of data.ticketTypes) {
        if (ttData.id) { // Update existing
          await tx.ticketType.update({
            where: { id: ttData.id, eventId: eventId }, // ensure it belongs to this event
            data: {
              name: ttData.name,
              price: tt.price,
              availability: tt.availability,
              description: tt.description,
            },
          });
        } else { // Create new
          await tx.ticketType.create({
            data: {
              name: ttData.name,
              price: ttData.price,
              availability: ttData.availability,
              description: ttData.description,
              eventId: eventId,
            },
          });
        }
      }
      
      // Re-fetch the event with all relations to return the final state
      return tx.event.findUnique({
        where: { id: eventId },
        include: { organizer: true, ticketTypes: true },
      });
    });

    if (!updatedPrismaEvent) return undefined; // Should not happen if transaction succeeds

    return mapPrismaEventToAppEvent(updatedPrismaEvent as PrismaEventWithRelations);
  } catch (error: any) {
     console.error("Error updating event:", error);
     // Re-throw the error so it can be caught by the API route and a proper response sent
     throw new Error(error.message || "Failed to update event due to an unexpected error.");
  }
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
  try {
    // Check for bookings associated with the event
    const bookingsCount = await prisma.booking.count({ where: { eventId }});
    if (bookingsCount > 0) {
      throw new Error(`Cannot delete event: ${bookingsCount} bookings are associated with this event. Please manage bookings first.`);
    }

    // If no bookings, proceed to delete ticket types and then the event
    await prisma.ticketType.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    return true;
  } catch (error: any) {
    console.error("Error deleting event:", error);
    if (error.message.includes("Cannot delete event")) {
        throw error; // Re-throw specific error
    }
    throw new Error("Failed to delete event due to an unexpected error.");
  }
};


// --- Booking Management ---
type PrismaBookingWithRelations = PrismaBooking & {
  user: PrismaUser;
  event: PrismaEvent;
  bookedTickets: PrismaBookedTicket[];
};

function mapPrismaBookingToAppBooking(prismaBooking: PrismaBookingWithRelations): Booking {
  return {
    id: prismaBooking.id,
    eventId: prismaBooking.eventId,
    userId: prismaBooking.userId,
    tickets: prismaBooking.bookedTickets.map(bt => ({
        eventNsid: bt.eventNsid, 
        ticketTypeId: bt.ticketTypeId,
        ticketTypeName: bt.ticketTypeName,
        quantity: bt.quantity,
        pricePerTicket: bt.pricePerTicket,
    })),
    totalPrice: prismaBooking.totalPrice,
    bookingDate: prismaBooking.bookingDate.toISOString(),
    eventName: prismaBooking.eventName,
    eventDate: prismaBooking.eventDate.toISOString(),
    eventLocation: prismaBooking.eventLocation,
    qrCodeValue: prismaBooking.qrCodeValue,
  };
}


export const createBooking = async (
  bookingData: {
    eventId: string;
    userId: string;
    tickets: BookedTicketItem[];
    totalPrice: number;
    event: Pick<Event, 'name' | 'date' | 'location' | 'slug'>;
  }
): Promise<Booking> => {
  
  // Transaction to ensure ticket availability is updated atomically with booking creation
  return prisma.$transaction(async (tx) => {
    // 1. Check and decrement ticket availability for each ticket type in the booking
    for (const ticketItem of bookingData.tickets) {
      const ticketType = await tx.ticketType.findUnique({
        where: { id: ticketItem.ticketTypeId }
      });

      if (!ticketType) {
        throw new Error(`Ticket type ${ticketItem.ticketTypeName} not found.`);
      }
      if (ticketType.availability < ticketItem.quantity) {
        throw new Error(`Not enough tickets available for ${ticketItem.ticketTypeName}. Requested: ${ticketItem.quantity}, Available: ${ticketType.availability}`);
      }

      await tx.ticketType.update({
        where: { id: ticketItem.ticketTypeId },
        data: { availability: { decrement: ticketItem.quantity } }
      });
    }

    // 2. Create the booking record
    const newBookingId = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const qrCodeValue = `EVENT:${bookingData.event.name},BOOKING_ID:${newBookingId},DATE:${new Date(bookingData.event.date).toLocaleDateString()}`;

    const createdBooking = await tx.booking.create({
      data: {
        id: newBookingId,
        user: { connect: { id: bookingData.userId } },
        event: { connect: { id: bookingData.eventId } },
        totalPrice: bookingData.totalPrice,
        eventName: bookingData.event.name,
        eventDate: new Date(bookingData.event.date),
        eventLocation: bookingData.event.location,
        qrCodeValue,
        bookedTickets: {
          create: bookingData.tickets.map(ticket => ({
            eventNsid: ticket.eventNsid, 
            ticketTypeId: ticket.ticketTypeId,
            ticketTypeName: ticket.ticketTypeName,
            quantity: ticket.quantity,
            pricePerTicket: ticket.pricePerTicket,
          })),
        },
      },
      include: { user: true, event: true, bookedTickets: true },
    });
    return mapPrismaBookingToAppBooking(createdBooking as PrismaBookingWithRelations);
  });
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  const prismaBooking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true, event: true, bookedTickets: true },
  });
  return prismaBooking ? mapPrismaBookingToAppBooking(prismaBooking as PrismaBookingWithRelations) : undefined;
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  const prismaBookings = await prisma.booking.findMany({
    include: { user: true, event: true, bookedTickets: true },
    orderBy: { bookingDate: 'desc' },
  });
  return prismaBookings.map(booking => mapPrismaBookingToAppBooking(booking as PrismaBookingWithRelations));
};


// --- Public Event Queries ---
export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    take: limit,
    include: { organizer: true, ticketTypes: true },
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventWithRelations));
};

export const getEventCategories = async (): Promise<string[]> => {
  const events = await prisma.event.findMany({
    select: { category: true },
    distinct: ['category'],
  });
  return events.map(event => event.category).filter(category => category !== null) as string[];
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
        { organizer: { name: { contains: query, mode: 'insensitive' } } },
        { venueName: { contains: query, mode: 'insensitive' } },
      ],
    });
  }
  if (category) {
    whereClause.AND.push({ category: { equals: category, mode: 'insensitive' } });
  }
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0); // Start of the day
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999); // End of the day
    whereClause.AND.push({ date: { gte: startDate, lte: endDate } });
  } else {
    // By default, only show future or ongoing events unless a specific past date is chosen
    // whereClause.AND.push({ date: { gte: new Date(new Date().setHours(0,0,0,0)) } });
  }
  if (location) {
    whereClause.AND.push({ location: { contains: location, mode: 'insensitive' } });
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    const ticketTypePriceConditions: any = {};
    if (minPrice !== undefined) ticketTypePriceConditions.gte = minPrice;
    if (maxPrice !== undefined) ticketTypePriceConditions.lte = maxPrice;
    
    whereClause.AND.push({ ticketTypes: { some: { price: ticketTypePriceConditions } } });
  }

  if (whereClause.AND.length === 0) delete whereClause.AND; // Remove if no conditions

  const prismaEvents = await prisma.event.findMany({
    where: whereClause,
    include: { organizer: true, ticketTypes: true },
    orderBy: { date: 'asc'},
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventWithRelations));
};
