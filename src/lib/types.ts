
import { z } from 'zod';

export interface TicketType {
  id: string;
  name: string; // e.g., General Admission, VIP
  price: number;
  availability: number; // Number of tickets available
  description?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO string
  location: string;
  description: string;
  category: string;
  imageUrl: string;
  organizer: { // This will be updated later to link to Organizer type
    name: string;
    contact?: string;
  };
  venue: {
    name: string;
    address?: string;
    mapLink?: string;
  };
  ticketTypes: TicketType[];
  slug: string;
}

export interface CartItem {
  eventId: string;
  eventNsid: string; // Used for event slug/id
  eventName: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  pricePerTicket: number;
}


export interface Booking {
  id: string;
  eventId: string;
  userId: string;
  tickets: Array<{ eventNsid: string; ticketTypeId: string; ticketTypeName: string; quantity: number; pricePerTicket: number }>;
  totalPrice: number;
  bookingDate: string; // ISO string
  eventName: string;
  eventDate: string;
  eventLocation: string;
  qrCodeValue: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
}

// Zod schema for event form validation
export const EventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen."),
  date: z.date({ required_error: "Event date is required" }),
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(3, "Category is required"),
  imageUrl: z.string().url({ message: "Invalid image URL" }),
  organizerName: z.string().min(3, "Organizer name is required"), // This will change later
  venueName: z.string().min(3, "Venue name is required"),
  venueAddress: z.string().optional(),
});

export type EventFormData = z.infer<typeof EventFormSchema>;

// Organizer Types
export interface Organizer {
  id: string;
  name: string;
  contactEmail: string;
  website?: string;
}

export const OrganizerFormSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters."),
  contactEmail: z.string().email("Invalid email address."),
  website: z.string().url("Invalid URL.").optional().or(z.literal('')), // Allow empty string or valid URL
});

export type OrganizerFormData = z.infer<typeof OrganizerFormSchema>;
