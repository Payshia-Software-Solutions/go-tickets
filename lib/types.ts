
import { z } from 'zod';

// --- User Related ---
export interface User {
  id: string;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// --- Organizer Related ---
export interface Organizer {
  id:string;
  name: string;
  contactEmail: string;
  website?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
export const OrganizerFormSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters."),
  contactEmail: z.string().email("Invalid email address."),
  website: z.string().url("Invalid URL.").optional().or(z.literal('')),
});
export type OrganizerFormData = z.infer<typeof OrganizerFormSchema>;


// --- TicketType Related ---
export const TicketTypeFormSchema = z.object({
  id: z.string().optional(), // For existing ticket types during update. For new ones, it's a client-side temp ID.
  name: z.string().min(1, "Ticket type name is required"),
  price: z.number({invalid_type_error: "Price must be a number"}).min(0, "Price must be non-negative"),
  availability: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative").describe("Default/template availability for new showtimes"),
  description: z.string().optional(),
});
export type TicketTypeFormData = z.infer<typeof TicketTypeFormSchema>;

export interface TicketType {
  id: string;
  eventId?: string; // Link back to event if needed directly on TT
  name: string;
  price: number;
  availability: number; // Template availability
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// --- ShowTime Related ---
export const ShowTimeTicketAvailabilityFormSchema = z.object({
  id: z.string().optional(), // For existing records (ShowTimeTicketAvailability ID from DB)
  ticketTypeId: z.string().min(1, "Ticket Type ID is required"), // Refers to the ID of a TicketType (either existing DB ID or temp client ID from TicketTypeFormSchema)
  ticketTypeName: z.string(), // For display in form, not directly saved to STTA but useful for UI
  availableCount: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative"),
});
export type ShowTimeTicketAvailabilityFormData = z.infer<typeof ShowTimeTicketAvailabilityFormSchema>;

export const ShowTimeFormSchema = z.object({
  id: z.string().optional(), // For existing showtimes from DB
  dateTime: z.date({ required_error: "Show date and time is required" }),
  ticketAvailabilities: z.array(ShowTimeTicketAvailabilityFormSchema).min(1, "At least one ticket type's availability must be specified for the showtime."),
});
export type ShowTimeFormData = z.infer<typeof ShowTimeFormSchema>;

export interface ShowTimeTicketAvailability {
  id: string;
  showTimeId?: string; // Link to showtime
  ticketTypeId?: string; // Link to ticket type
  ticketType: Pick<TicketType, 'id' | 'name' | 'price'>; // Embed basic ticket type info
  availableCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface ShowTime {
  id: string;
  eventId?: string; // Link back to event
  dateTime: string; // ISO string
  ticketAvailabilities: ShowTimeTicketAvailability[];
  createdAt?: Date;
  updatedAt?: Date;
}


// --- Event Related ---
export interface Event {
  id: string;
  name: string;
  slug: string;
  date: string; // ISO string for main event date
  location: string;
  description: string;
  category: string;
  imageUrl: string;
  organizer: Organizer; // Embed full organizer object
  organizerId?: string; // Store organizer ID
  ticketTypes: TicketType[];
  showTimes: ShowTime[];
  venue: {
    name: string;
    address?: string | null;
    mapLink?: string | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export const EventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Main event date is required" }),
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").default("<p></p>"),
  category: z.string().min(3, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }).or(z.string().startsWith("data:image/")), // Allow data URIs
  organizerId: z.string().min(1, "Organizer is required"),
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
  ticketTypes: z.array(TicketTypeFormSchema).min(1, "At least one ticket type definition is required."),
  showTimes: z.array(ShowTimeFormSchema).min(1, "At least one showtime is required."),
});
export type EventFormData = z.infer<typeof EventFormSchema>;


// --- Booking Related ---
// Represents a line item in a booking, linking to a specific ticket type and showtime
export interface BookedTicket {
  id: string; // Unique ID for this booked ticket instance
  bookingId?: string; // Link to Booking
  ticketTypeId: string;
  ticketTypeName: string; // Denormalized for convenience
  showTimeId: string; // Specifies which showtime this ticket is for
  quantity: number;
  pricePerTicket: number; // Price at the time of booking
  eventNsid: string; // event slug
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Booking {
  id: string;
  eventId: string;
  userId: string;
  bookingDate: string; // ISO string
  eventDate: string; // ISO string (specific showtime date for this booking)
  eventName: string;
  eventLocation: string;
  qrCodeValue: string;
  totalPrice: number;
  bookedTickets: BookedTicket[]; // Array of specific tickets part of this booking
  createdAt?: Date;
  updatedAt?: Date;
}

// Used for cart and for creating bookings (input to createBooking service)
export interface BookedTicketItem {
  eventId: string;
  eventNsid: string; // event slug
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
  showTimeId: string; // ID of the selected ShowTime
}

// Cart Item - similar to BookedTicketItem but might exist before a booking is finalized
export interface CartItem extends BookedTicketItem {
  eventName: string; // For display in cart
}
