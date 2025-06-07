import type { Event, Booking, User, EventFormData, Organizer, OrganizerFormData, BookedTicketItem, TicketTypeFormData, ShowTimeFormData } from './types';
import { prisma } from './db';
import type { Event as PrismaEvent, Organizer as PrismaOrganizer, User as PrismaUser, Booking as PrismaBooking, TicketType as PrismaTicketType, BookedTicket as PrismaBookedTicket, ShowTime as PrismaShowTime, ShowTimeTicketAvailability as PrismaShowTimeTicketAvailability } from '@prisma/client';

// --- User Management ---
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const createUser = async (userData: Omit<User, 'id' | 'isAdmin' | 'createdAt' | 'updatedAt'> & { isAdmin?: boolean }): Promise<User> => {
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
    console.error("Error updating organizer:", error);
    return null;
  }
};

export const deleteOrganizer = async (organizerId: string): Promise<boolean> => {
  try {
    const eventsLinked = await prisma.event.count({ where: { organizerId }});
    if (eventsLinked > 0) {
      throw new Error(`Cannot delete organizer: ${eventsLinked} events are linked.`);
    }
    await prisma.organizer.delete({
      where: { id: organizerId },
    });
    return true;
  } catch (error) {
    console.error("Error deleting organizer:", error);
    if (error instanceof Error && error.message.includes("Cannot delete organizer")) {
        throw error;
    }
    throw new Error("Could not delete organizer due to an unexpected error.");
  }
};


// --- Event Management ---
type PrismaEventFull = PrismaEvent & {
  organizer: PrismaOrganizer;
  ticketTypes: PrismaTicketType[];
  showTimes: (PrismaShowTime & {
    ticketAvailabilities: (PrismaShowTimeTicketAvailability & {
      ticketType: PrismaTicketType;
    })[];
  })[];
};

function mapPrismaEventToAppEvent(prismaEvent: PrismaEventFull): Event {
  return {
    id: prismaEvent.id,
    name: prismaEvent.name,
    slug: prismaEvent.slug,
    date: prismaEvent.date.toISOString(), // Main event date
    location: prismaEvent.location,
    description: prismaEvent.description || "",
    category: prismaEvent.category,
    imageUrl: prismaEvent.imageUrl,
    organizer: {
      id: prismaEvent.organizer.id,
      name: prismaEvent.organizer.name,
      contactEmail: prismaEvent.organizer.contactEmail,
      website: prismaEvent.organizer.website || undefined,
      // Prisma types for Organizer don't have createdAt/updatedAt by default unless selected
      // For simplicity, these are omitted from the mapped Organizer type here
    },
    ticketTypes: prismaEvent.ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      price: tt.price,
      availability: tt.availability, // This is the template availability
      description: tt.description || undefined,
    })),
    showTimes: prismaEvent.showTimes.map(st => ({
      id: st.id,
      dateTime: st.dateTime.toISOString(),
      ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
        id: sta.id,
        availableCount: sta.availableCount,
        ticketType: { // Embed basic ticket type info for convenience
          id: sta.ticketType.id,
          name: sta.ticketType.name,
          price: sta.ticketType.price,
        }
      })),
    })),
    venue: {
        name: prismaEvent.venueName,
        address: prismaEvent.venueAddress || undefined,
    }
  };
}

const eventIncludeFull = {
  organizer: true,
  ticketTypes: true,
  showTimes: {
    include: {
      ticketAvailabilities: {
        include: {
          ticketType: true, // Get details of the TicketType for each availability entry
        },
      },
    },
    orderBy: { dateTime: 'asc' } as const, // Type assertion for Prisma
  },
};

export const adminGetAllEvents = async (): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    include: eventIncludeFull,
    orderBy: { date: 'desc' },
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventFull));
};

export const getEvents = async (): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    include: eventIncludeFull,
    orderBy: { date: 'asc' },
    where: { date: { gte: new Date() } } // Or filter based on showTimes
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventFull));
};

export const getPopularEvents = async (limit: number = 4): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    orderBy: { date: 'asc' },
    take: limit,
    include: eventIncludeFull,
    where: { date: { gte: new Date() } } // Or filter based on showTimes
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventFull));
};

export const getEventBySlug = async (slug: string): Promise<Event | undefined> => {
  const prismaEvent = await prisma.event.findUnique({
    where: { slug },
    include: eventIncludeFull,
  });
  return prismaEvent ? mapPrismaEventToAppEvent(prismaEvent as PrismaEventFull) : undefined;
};

export const getEventById = async (id: string): Promise<Event | undefined> => {
  const prismaEvent = await prisma.event.findUnique({
    where: { id },
    include: eventIncludeFull,
  });
  return prismaEvent ? mapPrismaEventToAppEvent(prismaEvent as PrismaEventFull) : undefined;
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

  const createdEventWithRelations = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        name: data.name,
        slug: finalSlug,
        date: data.date, // Main event date
        location: data.location,
        description: data.description || "<p></p>",
        category: data.category,
        imageUrl: data.imageUrl,
        organizer: { connect: { id: data.organizerId } },
        venueName: data.venueName,
        venueAddress: data.venueAddress || null,
      },
    });

    // Create TicketTypes
    const createdTicketTypes: PrismaTicketType[] = [];
    for (const ttData of data.ticketTypes) {
      const createdTt = await tx.ticketType.create({
        data: {
          eventId: newEvent.id,
          name: ttData.name,
          price: ttData.price,
          availability: ttData.availability, // Template availability
          description: ttData.description,
        },
      });
      createdTicketTypes.push(createdTt);
    }

    // Create ShowTimes and their TicketAvailabilities
    for (const stData of data.showTimes) {
      const newShowTime = await tx.showTime.create({
        data: {
          eventId: newEvent.id,
          dateTime: stData.dateTime,
        },
      });

      for (const staData of stData.ticketAvailabilities) {
        // Find the corresponding createdTicketType to link by name if ID is not yet known,
        // or more robustly, ensure staData has a temporary client-side ID that maps to ttData.
        // For now, we assume staData.ticketTypeId refers to an ID that will exist or match a new one.
        // This part is tricky: staData.ticketTypeId is from the form, which might not have DB IDs yet for new ticket types.
        // A better approach: during form submission, ensure ticketTypes array in EventFormData has client-generated temp IDs
        // and ShowTimeTicketAvailabilityFormData references these temp IDs. Then map temp IDs to DB IDs after ticket types are created.
        // For simplicity of this step, we'll rely on the order or a pre-existing ID if editing.
        // During pure creation, `staData.ticketTypeId` must be an ID of one of the `createdTicketTypes`.
        // The form logic will need to ensure `ShowTimeTicketAvailabilityFormData` has the correct `ticketTypeId` (which could be the new DB ID or a temporary client ID mapped later).
        // We will assume the form provides the correct `ticketTypeId` for `ShowTimeTicketAvailabilityFormData` which refers to a `TicketType` from `data.ticketTypes`.
        // Let's refine this: staData should contain enough info to identify the TicketType from data.ticketTypes (e.g. by name or index if new)
        
        const parentTicketType = createdTicketTypes.find(ctt => ctt.id === staData.ticketTypeId); // This assumes staData.ticketTypeId holds the DB ID if already created.
                                                                                              // OR that EventForm correctly assigns the new IDs
        if (!parentTicketType) {
            // This case should ideally be prevented by form validation logic or careful ID management
            console.warn(`Could not find parent ticket type for ID: ${staData.ticketTypeId} while creating showtime availability for ${newEvent.name}`);
            continue; // Or throw error
        }

        await tx.showTimeTicketAvailability.create({
          data: {
            showTimeId: newShowTime.id,
            ticketTypeId: parentTicketType.id, // Use the ID of the *just created* ticket type
            availableCount: staData.availableCount,
          },
        });
      }
    }

    // Re-fetch the event with all relations
    return tx.event.findUnique({
      where: { id: newEvent.id },
      include: eventIncludeFull,
    });
  });

  if (!createdEventWithRelations) throw new Error("Failed to create event with relations.");
  return mapPrismaEventToAppEvent(createdEventWithRelations as PrismaEventFull);
};


export const updateEvent = async (eventId: string, data: EventFormData): Promise<Event | undefined> => {
  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true, showTimes: { include: { ticketAvailabilities: true } } }
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
      await tx.event.update({
        where: { id: eventId },
        data: {
          name: data.name,
          slug: finalNewSlug,
          date: data.date,
          location: data.location,
          description: data.description || "<p></p>",
          category: data.category,
          imageUrl: data.imageUrl,
          organizerId: data.organizerId,
          venueName: data.venueName,
          venueAddress: data.venueAddress || null,
        }
      });

      // --- Manage TicketTypes ---
      const existingDbTicketTypes = existingEvent.ticketTypes;
      const formTicketTypesData = data.ticketTypes;

      // IDs from the form (for existing ticket types)
      const formTicketTypeIds = formTicketTypesData.filter(tt => tt.id).map(tt => tt.id as string);
      // IDs in the DB
      const dbTicketTypeIds = existingDbTicketTypes.map(tt => tt.id);

      // Delete ticket types: in DB but not in form
      const ticketTypesToDeleteIds = dbTicketTypeIds.filter(id => !formTicketTypeIds.includes(id));
      for (const ttIdToDelete of ticketTypesToDeleteIds) {
        const bookingsExistForTicketType = await tx.bookedTicket.count({
          where: { ticketTypeId: ttIdToDelete, booking: { eventId: eventId } }
        });
        if (bookingsExistForTicketType > 0) {
          throw new Error(`Cannot delete ticket type (ID: ${ttIdToDelete}). It has existing bookings.`);
        }
        // Also need to delete ShowTimeTicketAvailabilities associated with this ticket type
        await tx.showTimeTicketAvailability.deleteMany({ where: { ticketTypeId: ttIdToDelete } });
        await tx.ticketType.delete({ where: { id: ttIdToDelete } });
      }

      // Update or Create ticket types
      const createdOrUpdatedTicketTypes: PrismaTicketType[] = [];
      for (const ttData of formTicketTypesData) {
        if (ttData.id) { // Update existing
          const updatedTt = await tx.ticketType.update({
            where: { id: ttData.id, eventId: eventId },
            data: {
              name: ttData.name,
              price: ttData.price,
              availability: ttData.availability,
              description: ttData.description,
            },
          });
          createdOrUpdatedTicketTypes.push(updatedTt);
        } else { // Create new
          const newTt = await tx.ticketType.create({
            data: {
              eventId: eventId,
              name: ttData.name,
              price: ttData.price,
              availability: ttData.availability,
              description: ttData.description,
            },
          });
          createdOrUpdatedTicketTypes.push(newTt);
        }
      }
      
      // --- Manage ShowTimes and their TicketAvailabilities ---
      const existingDbShowTimes = existingEvent.showTimes;
      const formShowTimesData = data.showTimes;

      const formShowTimeIds = formShowTimesData.filter(st => st.id).map(st => st.id as string);
      const dbShowTimeIds = existingDbShowTimes.map(st => st.id);

      // Delete ShowTimes: in DB but not in form
      const showTimesToDeleteIds = dbShowTimeIds.filter(id => !formShowTimeIds.includes(id));
      for (const stIdToDelete of showTimesToDeleteIds) {
        const bookingsExistForShowTime = await tx.bookedTicket.count({
          where: { showTimeId: stIdToDelete, booking: { eventId: eventId } } // Redundant eventId check, but safe
        });
        if (bookingsExistForShowTime > 0) {
          throw new Error(`Cannot delete showtime (ID: ${stIdToDelete}). It has existing bookings.`);
        }
        // Deleting a ShowTime will cascade delete its ShowTimeTicketAvailabilities due to schema
        await tx.showTime.delete({ where: { id: stIdToDelete } });
      }

      // Update or Create ShowTimes
      for (const stData of formShowTimesData) {
        let currentShowTime: PrismaShowTime;
        if (stData.id) { // Update existing ShowTime
          currentShowTime = await tx.showTime.update({
            where: { id: stData.id, eventId: eventId },
            data: { dateTime: stData.dateTime },
          });
        } else { // Create new ShowTime
          currentShowTime = await tx.showTime.create({
            data: {
              eventId: eventId,
              dateTime: stData.dateTime,
            },
          });
        }

        // Manage ShowTimeTicketAvailabilities for this ShowTime
        const existingDbAvailabilities = existingDbShowTimes.find(est => est.id === currentShowTime.id)?.ticketAvailabilities || [];
        const formAvailabilitiesData = stData.ticketAvailabilities;

        const formAvailabilityTicketTypeIds = formAvailabilitiesData.map(fa => fa.ticketTypeId);
        const dbAvailabilityTicketTypeIds = existingDbAvailabilities.map(da => da.ticketTypeId);
        
        // Delete ShowTimeTicketAvailabilities: in DB for this showtime, but not in form for this showtime
        const availabilitiesToDeleteTicketTypeIds = dbAvailabilityTicketTypeIds.filter(id => !formAvailabilityTicketTypeIds.includes(id));
        for (const ttId of availabilitiesToDeleteTicketTypeIds) {
          // Check for bookings for this specific showtime and ticket type combo is harder here without more direct link from BookedTicket to ShowTimeTicketAvailability
          // The ShowTime deletion check above is the primary guard for bookings.
          // If we need finer-grained checks, BookedTicket should link to ShowTimeTicketAvailability.id
          await tx.showTimeTicketAvailability.deleteMany({
            where: { showTimeId: currentShowTime.id, ticketTypeId: ttId }
          });
        }

        // Update or Create ShowTimeTicketAvailabilities
        for (const staData of formAvailabilitiesData) {
          const existingSta = existingDbAvailabilities.find(da => da.ticketTypeId === staData.ticketTypeId && da.showTimeId === currentShowTime.id);
          const targetTicketType = createdOrUpdatedTicketTypes.find(tt => tt.id === staData.ticketTypeId);
          if (!targetTicketType) {
             console.warn(`Skipping ShowTimeTicketAvailability: TicketType ID ${staData.ticketTypeId} not found in created/updated list.`);
             continue;
          }

          if (existingSta) { // Update
            await tx.showTimeTicketAvailability.update({
              where: { id: existingSta.id },
              data: { availableCount: staData.availableCount },
            });
          } else { // Create
             await tx.showTimeTicketAvailability.create({
              data: {
                showTimeId: currentShowTime.id,
                ticketTypeId: targetTicketType.id, // Use the ID of the created/updated ticket type
                availableCount: staData.availableCount,
              },
            });
          }
        }
      } // End loop for ShowTimes

      return tx.event.findUnique({
        where: { id: eventId },
        include: eventIncludeFull,
      });
    }); // End transaction

    if (!updatedPrismaEvent) return undefined;
    return mapPrismaEventToAppEvent(updatedPrismaEvent as PrismaEventFull);
  } catch (error: any) {
     console.error("Error updating event:", error);
     throw new Error(error.message || "Failed to update event due to an unexpected error.");
  }
};


export const deleteEvent = async (eventId: string): Promise<boolean> => {
  try {
    const bookingsCount = await prisma.booking.count({ where: { eventId }});
    if (bookingsCount > 0) {
      throw new Error(`Cannot delete event: ${bookingsCount} bookings are associated. Please manage bookings first.`);
    }
    // Cascading deletes for TicketType, ShowTime, and ShowTimeTicketAvailability should be handled by Prisma schema
    await prisma.event.delete({ where: { id: eventId } });
    return true;
  } catch (error: any) {
    console.error("Error deleting event:", error);
    if (error.message.includes("Cannot delete event")) {
        throw error;
    }
    throw new Error("Failed to delete event due to an unexpected error.");
  }
};

// --- Booking Management ---
type PrismaBookingFull = PrismaBooking & {
  user: PrismaUser;
  event: PrismaEvent;
  bookedTickets: (PrismaBookedTicket & { showTime: PrismaShowTime, ticketType: PrismaTicketType })[];
};

// Needs to be updated if Booking structure for app changes
function mapPrismaBookingToAppBooking(prismaBooking: PrismaBookingFull): Booking {
  const firstBookedTicket = prismaBooking.bookedTickets[0];
  const eventDateForBooking = firstBookedTicket ? firstBookedTicket.showTime.dateTime.toISOString() : prismaBooking.eventDate.toISOString();

  return {
    id: prismaBooking.id,
    eventId: prismaBooking.eventId,
    userId: prismaBooking.userId,
    bookedTickets: prismaBooking.bookedTickets.map(bt => ({
        eventNsid: bt.eventNsid,
        ticketTypeId: bt.ticketTypeId,
        ticketTypeName: bt.ticketTypeName,
        quantity: bt.quantity,
        pricePerTicket: bt.pricePerTicket,
        showTimeId: bt.showTimeId,
        // Omitting other PrismaBookedTicket fields not in Booking['bookedTickets'][number]
    })),
    totalPrice: prismaBooking.totalPrice,
    bookingDate: prismaBooking.bookingDate.toISOString(),
    eventName: prismaBooking.eventName,
    eventDate: eventDateForBooking, // Use the specific showtime's date
    eventLocation: prismaBooking.eventLocation,
    qrCodeValue: prismaBooking.qrCodeValue,
  };
}

export const createBooking = async (
  bookingData: {
    eventId: string;
    userId: string;
    tickets: BookedTicketItem[]; // Now includes showTimeId
    totalPrice: number;
    event: Pick<Event, 'name' | 'location' | 'slug'>; // Event here is general event info
    // showTime: Pick<ShowTime, 'id' | 'dateTime'>; // Need specific showtime for this booking
  }
): Promise<Booking> => {
  // Assumption: all tickets in bookingData.tickets are for the SAME showTimeId
  const showTimeId = bookingData.tickets[0]?.showTimeId;
  if (!showTimeId) {
    throw new Error("ShowTime ID is missing in booking data.");
  }

  const showTimeDetails = await prisma.showTime.findUnique({ where: {id: showTimeId }});
  if (!showTimeDetails) {
    throw new Error(`ShowTime with ID ${showTimeId} not found.`);
  }

  return prisma.$transaction(async (tx) => {
    for (const ticketItem of bookingData.tickets) {
      if (ticketItem.showTimeId !== showTimeId) {
        throw new Error("All tickets in a single booking must be for the same showtime.");
      }
      const sta = await tx.showTimeTicketAvailability.findUnique({
        where: { showTimeId_ticketTypeId: { showTimeId: ticketItem.showTimeId, ticketTypeId: ticketItem.ticketTypeId } }
      });

      if (!sta) {
        throw new Error(`Availability record not found for ticket type ${ticketItem.ticketTypeName} at the selected showtime.`);
      }
      if (sta.availableCount < ticketItem.quantity) {
        throw new Error(`Not enough tickets available for ${ticketItem.ticketTypeName}. Requested: ${ticketItem.quantity}, Available: ${sta.availableCount}`);
      }

      await tx.showTimeTicketAvailability.update({
        where: { id: sta.id },
        data: { availableCount: { decrement: ticketItem.quantity } }
      });
    }

    const newBookingId = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const qrCodeValue = `EVENT:${bookingData.event.name},BOOKING_ID:${newBookingId},SHOWTIME:${showTimeDetails.dateTime.toISOString()}`;

    const createdBooking = await tx.booking.create({
      data: {
        id: newBookingId,
        user: { connect: { id: bookingData.userId } },
        event: { connect: { id: bookingData.eventId } },
        totalPrice: bookingData.totalPrice,
        eventName: bookingData.event.name,
        eventDate: showTimeDetails.dateTime, // Use the specific showtime date
        eventLocation: bookingData.event.location,
        qrCodeValue,
        bookedTickets: {
          create: bookingData.tickets.map(ticket => ({
            eventNsid: ticket.eventNsid,
            ticketTypeId: ticket.ticketTypeId,
            showTimeId: ticket.showTimeId,
            ticketTypeName: ticket.ticketTypeName,
            quantity: ticket.quantity,
            pricePerTicket: ticket.pricePerTicket,
          })),
        },
      },
      include: { user: true, event: true, bookedTickets: { include: { showTime: true, ticketType: true } } },
    });
    return mapPrismaBookingToAppBooking(createdBooking as PrismaBookingFull);
  });
};


export const getBookingById = async (id: string): Promise<Booking | undefined> => {
  const prismaBooking = await prisma.booking.findUnique({
    where: { id },
    include: { user: true, event: true, bookedTickets: { include: { showTime: true, ticketType: true } } },
  });
  return prismaBooking ? mapPrismaBookingToAppBooking(prismaBooking as PrismaBookingFull) : undefined;
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  const prismaBookings = await prisma.booking.findMany({
    include: { user: true, event: true, bookedTickets: { include: { showTime: true, ticketType: true } } },
    orderBy: { bookingDate: 'desc' },
  });
  return prismaBookings.map(booking => mapPrismaBookingToAppBooking(booking as PrismaBookingFull));
};


// --- Public Event Queries ---
export const getUpcomingEvents = async (limit: number = 4): Promise<Event[]> => {
  const prismaEvents = await prisma.event.findMany({
    where: { date: { gte: new Date() } }, // Or filter by showTimes
    orderBy: { date: 'asc' },
    take: limit,
    include: eventIncludeFull,
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventFull));
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

  // Date filter needs to consider showtimes now
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    whereClause.AND.push({
      showTimes: { some: { dateTime: { gte: startDate, lte: endDate } } }
    });
  } else {
     whereClause.AND.push({
      OR: [
        { date: { gte: new Date(new Date().setHours(0,0,0,0)) } }, // Main event date
        { showTimes: { some: { dateTime: { gte: new Date(new Date().setHours(0,0,0,0)) } } } } // Any future showtime
      ]
    });
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

  if (whereClause.AND.length === 0) delete whereClause.AND;

  const prismaEvents = await prisma.event.findMany({
    where: whereClause,
    include: eventIncludeFull,
    orderBy: { date: 'asc'},
  });
  return prismaEvents.map(event => mapPrismaEventToAppEvent(event as PrismaEventFull));
};