
import { z } from 'zod';

// --- User Related ---
export const BillingAddressSchema = z.object({
  street: z.string().min(3, "Street address is required."),
  city: z.string().min(2, "City is required."),
  state: z.string().min(2, "State/Province is required."),
  postalCode: z.string().min(3, "Postal/Zip code is required."),
  country: z.string().min(2, "Country is required."),
});
export type BillingAddress = z.infer<typeof BillingAddressSchema>;

export interface User {
  id: string;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
  billingAddress?: BillingAddress | null;
  createdAt?: string; // Changed to string to match potential API response
  updatedAt?: string; // Changed to string
}

// --- Organizer Related ---
export interface Organizer {
  id:string;
  name: string;
  contactEmail: string;
  website?: string | null;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
}
export const OrganizerFormSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters."),
  contactEmail: z.string().email("Invalid email address."),
  website: z.string().url("Invalid URL.").optional().or(z.literal('')),
});
export type OrganizerFormData = z.infer<typeof OrganizerFormSchema>;


// --- TicketType Related ---
export const TicketTypeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Ticket type name is required"),
  price: z.number({invalid_type_error: "Price must be a number"}).min(0, "Price must be non-negative"),
  availability: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative").describe("Default/template availability for new showtimes"),
  description: z.string().optional(),
});
export type TicketTypeFormData = z.infer<typeof TicketTypeFormSchema>;

export interface TicketType {
  id: string;
  eventId?: string;
  name: string;
  price: number;
  availability: number; // Template availability
  description?: string | null;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
}

// --- ShowTime Related ---
export const ShowTimeTicketAvailabilityFormSchema = z.object({
  id: z.string().optional(),
  ticketTypeId: z.string().min(1, "Ticket Type ID is required"),
  ticketTypeName: z.string(),
  availableCount: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative"),
});
export type ShowTimeTicketAvailabilityFormData = z.infer<typeof ShowTimeTicketAvailabilityFormSchema>;

export const ShowTimeFormSchema = z.object({
  id: z.string().optional(),
  dateTime: z.date({ required_error: "Show date and time is required" }),
  ticketAvailabilities: z.array(ShowTimeTicketAvailabilityFormSchema).min(1, "At least one ticket type's availability must be specified for the showtime."),
});
export type ShowTimeFormData = z.infer<typeof ShowTimeFormSchema>;

export interface ShowTimeTicketAvailability {
  id: string;
  showTimeId?: string;
  ticketTypeId?: string;
  ticketType: Pick<TicketType, 'id' | 'name' | 'price'>;
  availableCount: number;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
}
export interface ShowTime {
  id: string;
  eventId?: string;
  dateTime: string; // ISO string
  ticketAvailabilities: ShowTimeTicketAvailability[];
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
}


// --- Event Related ---
// This interface represents the full event detail structure,
// which we expect from an endpoint like /events/slug/{slug}
export interface Event {
  id: string;
  name: string;
  slug: string;
  date: string; // API might send "YYYY-MM-DD HH:MM:SS", store as ISO string internally after parsing
  location: string;
  description: string;
  category: string;
  imageUrl: string;
  
  // Direct fields from API list sample
  venueName: string;
  venueAddress?: string | null;
  organizerId: string;

  // Optional, expected to be populated for detail views
  organizer?: Organizer;
  ticketTypes?: TicketType[];
  showTimes?: ShowTime[];
  
  // mapLink can be constructed or part of a richer venue object from API
  mapLink?: string | null; 

  createdAt?: string; // API sends "YYYY-MM-DD HH:MM:SS"
  updatedAt?: string; // API sends "YYYY-MM-DD HH:MM:SS"
}

// Zod schema for validating Event form data in admin
export const EventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Main event date is required" }), // Form uses Date object
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").default("<p></p>"),
  category: z.string().min(3, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }).or(z.string().startsWith("data:image/")),
  organizerId: z.string().min(1, "Organizer is required"), // Form stores organizerId
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
  ticketTypes: z.array(TicketTypeFormSchema).min(1, "At least one ticket type definition is required."),
  showTimes: z.array(ShowTimeFormSchema).min(1, "At least one showtime is required."),
});
export type EventFormData = z.infer<typeof EventFormSchema>;


// --- Booking Related ---
export interface BookedTicket {
  id: string;
  bookingId?: string;
  ticketTypeId: string;
  ticketTypeName: string;
  showTimeId: string;
  quantity: number;
  pricePerTicket: number;
  eventNsid: string;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
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
  billingAddress: BillingAddress;
  bookedTickets: BookedTicket[];
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
}

export interface BookedTicketItem {
  eventId: string;
  eventNsid: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
  showTimeId: string;
}

export interface CartItem extends BookedTicketItem {
  eventName: string;
}
