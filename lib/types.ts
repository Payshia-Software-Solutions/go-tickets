
import { z } from 'zod';
import type { Event as PrismaEvent, Organizer as PrismaOrganizer, User as PrismaUser, Booking as PrismaBooking, TicketType as PrismaTicketType } from '@prisma/client';


// We can use Prisma's generated types directly or extend them if needed
// For simplicity, we'll alias them for now.
// You might want to create more specific types for API responses or form data later.

export type User = PrismaUser;
export type Organizer = PrismaOrganizer;

export interface TicketType extends Omit<PrismaTicketType, 'eventId' | 'id' | 'price' | 'availability'> {
  // Prisma's TicketType is good, but our app used it slightly differently as an array on Event.
  // This interface tries to bridge that. For a full Prisma integration, you might embed TicketType generation
  // more directly or change how EventForm handles ticketTypes.
  id: string; // Keep original ID structure for form if needed
  name: string;
  price: number;
  availability: number;
  description?: string;
}

// Event type combining Prisma's Event with a potentially richer TicketType array
export interface Event extends Omit<PrismaEvent, 'ticketTypes' | 'date'> {
  date: string; // Keep as ISO string for frontend compatibility for now
  ticketTypes: TicketType[]; // Array of our specific TicketType
}


export interface CartItem {
  eventId: string;
  eventNsid: string; 
  eventName: string;
  ticketTypeId: string; 
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
}


// Booking related types
export interface BookedTicketItem { // Represents the structure within bookingData.tickets from frontend
    eventNsid: string;
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    pricePerTicket: number;
}
export interface Booking extends Omit<PrismaBooking, 'eventDate' | 'bookingDate'> {
  bookingDate: string; // Keep as ISO string
  eventDate: string; // Keep as ISO string
  // PrismaBooking already has BookedTicket[] relation named bookedTickets
}


// Zod schema for event form validation
export const EventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Event date is required" }),
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").default("<p></p>"),
  category: z.string().min(3, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }).or(z.string().startsWith("data:image/")), // Allow data URIs
  organizerId: z.string().min(1, "Organizer is required"),
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
});
export type EventFormData = z.infer<typeof EventFormSchema>;


// Organizer Types
export const OrganizerFormSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters."),
  contactEmail: z.string().email("Invalid email address."),
  website: z.string().url("Invalid URL.").optional().or(z.literal('')), 
});
export type OrganizerFormData = z.infer<typeof OrganizerFormSchema>;
