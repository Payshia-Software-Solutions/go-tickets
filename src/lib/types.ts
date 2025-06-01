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
  organizer: {
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
}
