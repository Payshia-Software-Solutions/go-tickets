

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
  password?: string; // Added password
  name?: string | null;
  isAdmin?: boolean;
  billingAddress?: BillingAddress | null;
  createdAt?: string;
  updatedAt?: string;
}

// Zod schema for signup form
export const SignupFormSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string(),
  billing_street: z.string().optional().or(z.literal('')),
  billing_city: z.string().optional().or(z.literal('')),
  billing_state: z.string().optional().or(z.literal('')),
  billing_postal_code: z.string().optional().or(z.literal('')),
  billing_country: z.string().optional().or(z.literal('')),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine(data => {
  const billingFields = [data.billing_street, data.billing_city, data.billing_state, data.billing_postal_code, data.billing_country];
  const filledFields = billingFields.filter(field => field && field.trim() !== "").length;
  if (filledFields > 0 && filledFields < 5) {
  }
  return true;
});

export type SignupFormData = z.infer<typeof SignupFormSchema>;


// --- Organizer Related ---
export interface Organizer {
  id:string;
  name: string;
  contactEmail: string;
  website?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export const OrganizerFormSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters."),
  contactEmail: z.string().email("Invalid email address."),
  website: z.string().url("Invalid URL.").optional().or(z.literal('')),
});
export type OrganizerFormData = z.infer<typeof OrganizerFormSchema>;

// --- Category Related ---
export interface Category {
  id: string | number;
  name: string;
  svg_name?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export const CategoryFormSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters long.").max(50, "Category name must be 50 characters or less."),
  svg_name: z.string().optional().nullable(),
});
export type CategoryFormData = z.infer<typeof CategoryFormSchema>;


// --- TicketType Related ---
export const TicketTypeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Ticket type name is required"),
  price: z.number({invalid_type_error: "Price must be a number"}).min(0, "Price must be non-negative"),
  availability: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative").describe("Total availability for this ticket type"),
  description: z.string().optional(),
  showtimeId: z.string().optional(),
});
export type TicketTypeFormData = z.infer<typeof TicketTypeFormSchema>;

export interface TicketType {
  id: string;
  eventId?: string;
  showtimeId?: string | null;
  name: string;
  price: number;
  availability: number;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// --- ShowTime Related ---
export const ShowTimeTicketAvailabilityFormSchema = z.object({
  id: z.string().optional(),
  ticketTypeId: z.string().min(1, "Ticket Type ID is required"),
  ticketTypeName: z.string(),
  availableCount: z.number({invalid_type_error: "Availability must be a number"}).int("Availability must be a whole number").min(0, "Availability must be non-negative"),
});
export type ShowTimeTicketAvailabilityFormData = z.infer<typeof ShowTimeTicketAvailabilityFormSchema>;

// This schema is used for editing an event where everything is nested
export const ShowTimeFormSchema = z.object({
  id: z.string().optional(),
  dateTime: z.date({ required_error: "Show date and time is required" }),
  ticketAvailabilities: z.array(ShowTimeTicketAvailabilityFormSchema), // Removed min(1) for flexibility in form
});
export type ShowTimeFormData = z.infer<typeof ShowTimeFormSchema>;

// This schema is used for the simple "Add Showtime" form in the new two-step flow
export const AddShowTimeFormSchema = z.object({
  dateTime: z.date({ required_error: "Show date and time is required" }),
});
export type AddShowTimeFormData = z.infer<typeof AddShowTimeFormSchema>;

export interface ShowTimeTicketAvailability {
  id: string;
  showTimeId?: string;
  ticketTypeId?: string;
  ticketType: Pick<TicketType, 'id' | 'name' | 'price'>;
  availableCount: number;
  createdAt?: string;
  updatedAt?: string;
}
export interface ShowTime {
  id: string;
  eventId?: string;
  dateTime: string; // ISO string
  ticketAvailabilities: ShowTimeTicketAvailability[];
  createdAt?: string;
  updatedAt?: string;
}


// --- Event Related ---
export interface Event {
  id: string;
  name: string;
  slug: string;
  date: string;
  location: string;
  description: string;
  category: string;
  imageUrl: string;
  venueName: string;
  venueAddress?: string | null;
  organizerId: string;
  organizer?: Organizer;
  ticketTypes?: TicketType[];
  showTimes?: ShowTime[];
  mapLink?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Schema for Step 1 of event creation (core details only)
export const CoreEventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Main event date is required" }),
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").default("<p></p>"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }).or(z.string().startsWith("data:image/")).optional().or(z.literal('')),
  organizerId: z.string().min(1, "Organizer is required"),
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
});
export type CoreEventFormData = z.infer<typeof CoreEventFormSchema>;

// Zod schema for validating the full event form data, typically used for editing existing events.
export const EventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Main event date is required" }),
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").default("<p></p>"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }).or(z.string().startsWith("data:image/")).optional().or(z.literal('')),
  organizerId: z.string().min(1, "Organizer is required"),
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
  ticketTypes: z.array(TicketTypeFormSchema), // Removed min(1) to allow creation with no tickets initially
  showTimes: z.array(ShowTimeFormSchema), // Removed min(1) to allow creation with no showtimes initially
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
  checkedInCount?: number; // Added to track check-ins
  createdAt?: string;
  updatedAt?: string;
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
  bookedTickets: BookedTicket[]; // May be empty if summary view
  showtime?: string; // From API, e.g., "14:00:00"
  tickettype?: string; // From API, e.g., "Early Bird, Regular"
  scannedAt?: string | null; // ISO string when the ticket was scanned
  createdAt?: string;
  updatedAt?: string;
}

export interface BookedTicketItem {
  eventId: string;
  eventNsid: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
  showTimeId: string;
  showTimeDateTime: string;
}

export interface CartItem extends BookedTicketItem {
  eventName: string;
}
