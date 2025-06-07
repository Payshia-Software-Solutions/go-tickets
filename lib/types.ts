
import { z } from 'zod';
import type { Event as PrismaEvent, Organizer as PrismaOrganizer, User as PrismaUser, Booking as PrismaBooking, TicketType as PrismaTicketType, ShowTime as PrismaShowTime, ShowTimeTicketAvailability as PrismaShowTimeTicketAvailability, BookedTicket as PrismaBookedTicket } from '@prisma/client';

// We can use Prisma's generated types directly or extend them if needed
export type User = PrismaUser;
export type Organizer = PrismaOrganizer;

// --- TicketType Related ---
export const TicketTypeFormSchema = z.object({
  id: z.string().optional(), // For existing ticket types during update
  name: z.string().min(1, "Ticket type name is required"),
  price: z.number({invalid_type_error: "Price must be a number"}).min(0, "Price must be non-negative"),
  availability: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative").describe("Default/template availability for new showtimes"),
  description: z.string().optional(),
});
export type TicketTypeFormData = z.infer<typeof TicketTypeFormSchema>;

export interface TicketType extends Omit<PrismaTicketType, 'eventId' | 'price' | 'availability' | 'description' | 'createdAt' | 'updatedAt'> {
  id: string;
  name: string;
  price: number;
  availability: number; // Template availability
  description?: string | null;
}

// --- ShowTime Related ---
export const ShowTimeTicketAvailabilityFormSchema = z.object({
  id: z.string().optional(), // For existing records (ShowTimeTicketAvailability ID)
  ticketTypeId: z.string().min(1, "Ticket Type ID is required"), // Refers to the ID of a TicketType (either existing DB ID or temp client ID)
  ticketTypeName: z.string(), // For display in form, not directly saved but useful for UI
  availableCount: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative"),
});
export type ShowTimeTicketAvailabilityFormData = z.infer<typeof ShowTimeTicketAvailabilityFormSchema>;

export const ShowTimeFormSchema = z.object({
  id: z.string().optional(), // For existing showtimes
  dateTime: z.date({ required_error: "Show date and time is required" }),
  ticketAvailabilities: z.array(ShowTimeTicketAvailabilityFormSchema).min(1, "At least one ticket type's availability must be specified for the showtime."),
});
export type ShowTimeFormData = z.infer<typeof ShowTimeFormSchema>;

export interface ShowTimeTicketAvailability extends Omit<PrismaShowTimeTicketAvailability, 'showTimeId' | 'ticketTypeId' | 'createdAt' | 'updatedAt'> {
  id: string;
  ticketType: Pick<TicketType, 'id' | 'name' | 'price'>; // Include basic ticket type info
  availableCount: number;
}
export interface ShowTime extends Omit<PrismaShowTime, 'eventId' | 'dateTime' | 'createdAt' | 'updatedAt'> {
  id: string;
  dateTime: string; // ISO string
  ticketAvailabilities: ShowTimeTicketAvailability[];
}


// --- Event Related ---
export interface Event extends Omit<PrismaEvent, 'ticketTypes' | 'showTimes' | 'date' | 'description' | 'organizerId' | 'createdAt' | 'updatedAt' | 'venueName' | 'venueAddress'> {
  date: string; // Keep as ISO string for frontend compatibility for now (main/first date)
  description: string;
  organizer: Organizer;
  ticketTypes: TicketType[];
  showTimes: ShowTime[];
  venue: {
    name: string;
    address?: string | null; // Prisma type is String?
  };
}

export const EventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Main event date is required" }), // Main/first event date
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").default("<p></p>"),
  category: z.string().min(3, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }).or(z.string().startsWith("data:image/")),
  organizerId: z.string().min(1, "Organizer is required"),
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
  ticketTypes: z.array(TicketTypeFormSchema).min(1, "At least one ticket type definition is required."),
  showTimes: z.array(ShowTimeFormSchema).min(1, "At least one showtime is required."),
});
export type EventFormData = z.infer<typeof EventFormSchema>;


// --- Booking Related ---
export interface BookedTicketItem extends Omit<PrismaBookedTicket, 'id' | 'bookingId' | 'ticketTypeId' | 'showTimeId' | 'createdAt' | 'updatedAt'> {
  // For cart and creating bookings
  eventNsid: string; // event slug
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
  showTimeId: string; // ID of the selected ShowTime
}
export interface Booking extends Omit<PrismaBooking, 'eventDate' | 'bookingDate' | 'userId' | 'eventId' | 'createdAt' | 'updatedAt' | 'eventLocation' | 'eventName' | 'qrCodeValue' | 'totalPrice'> {
  id: string;
  eventId: string;
  userId: string;
  bookingDate: string; // ISO string
  eventDate: string; // ISO string (specific showtime date)
  eventName: string;
  eventLocation: string;
  qrCodeValue: string;
  totalPrice: number;
  bookedTickets: Array<Omit<PrismaBookedTicket, 'bookingId' | 'createdAt' | 'updatedAt'>>; // This should likely be PrismaBookedTicket from Prisma
}


// --- Organizer Types --- (already defined from previous step, keep as is)
export const OrganizerFormSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters."),
  contactEmail: z.string().email("Invalid email address."),
  website: z.string().url("Invalid URL.").optional().or(z.literal('')),
});
export type OrganizerFormData = z.infer<typeof OrganizerFormSchema>;
