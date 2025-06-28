
import type { Booking, BookedTicket, BillingAddress, CartItem } from '@/lib/types';
import { BOOKINGS_API_URL } from '@/lib/constants';
import { parseApiDateString, generateId } from './api.service';
import { format, parseISO } from 'date-fns';
import { getEventBySlug, fetchEventByIdFromApi } from './event.service';
import { getUserById } from './user.service';

interface RawApiBooking {
  id: string | number;
  event_id?: string | number;
  eventId?: string | number;
  user_id?: string | number;
  userId?: string | number;
  booking_date?: string;
  bookingDate?: string;
  event_date?: string;
  eventDate?: string;
  event_name?: string;
  eventName?: string;
  event_location?: string;
  eventLocation?: string;
  qr_code_value?: string;
  qrCodeValue?: string;
  total_price?: string | number;
  totalPrice?: string | number;
  billing_address?: string | BillingAddress;
  booked_tickets?: RawApiBookedTicket[];
  bookedTickets?: RawApiBookedTicket[];
  event_slug?: string;
  payment_status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  showtime?: string;
  tickettype?: string;
}

interface RawApiBookedTicket {
  id: string | number;
  booking_id?: string | number;
  bookingId?: string | number;
  ticket_type_id?: string | number;
  ticketTypeId?: string | number;
  ticket_type_name?: string;
  ticketTypeName?: string;
  show_time_id?: string | number;
  showTimeId?: string | number;
  quantity: string | number;
  price_per_ticket?: string | number;
  pricePerTicket?: string | number;
  event_nsid?: string;
  event_slug?: string;
  eventId?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export const transformApiBookingToAppBooking = (apiBooking: RawApiBooking): Booking => {
  let parsedBillingAddress: BillingAddress;
  if (typeof apiBooking.billing_address === 'string') {
    try {
      parsedBillingAddress = JSON.parse(apiBooking.billing_address);
    } catch {
      console.error("Failed to parse billing_address string:", "Raw:", apiBooking.billing_address);
      parsedBillingAddress = { email: "", phone_number: "", street: "", city: "", state: "", postalCode: "", country: "" };
    }
  } else if (typeof apiBooking.billing_address === 'object' && apiBooking.billing_address !== null) {
    parsedBillingAddress = apiBooking.billing_address;
  } else {
    // @ts-expect-error Property 'billing_street' does not exist on type 'RawApiBooking'.
    if (apiBooking.billing_street || apiBooking.billing_city) {
        parsedBillingAddress = {
            // @ts-expect-error Property 'billing_email' does not exist on type 'RawApiBooking'.
            email: apiBooking.billing_email || "",
            // @ts-expect-error Property 'billing_phone_number' does not exist on type 'RawApiBooking'.
            phone_number: apiBooking.billing_phone_number || "",
            // @ts-expect-error Property 'billing_street' does not exist on type 'RawApiBooking'.
            street: apiBooking.billing_street || "",
            // @ts-expect-error Property 'billing_city' does not exist on type 'RawApiBooking'.
            city: apiBooking.billing_city || "",
            // @ts-expect-error Property 'billing_state' does not exist on type 'RawApiBooking'.
            state: apiBooking.billing_state || "",
            // @ts-expect-error Property 'billing_postal_code' does not exist on type 'RawApiBooking'.
            postalCode: apiBooking.billing_postal_code || "",
            // @ts-expect-error Property 'billing_country' does not exist on type 'RawApiBooking'
            country: apiBooking.billing_country || "",
        };
    } else {
        parsedBillingAddress = { email: "", phone_number: "", street: "", city: "", state: "", postalCode: "", country: "" };
    }
  }

  const rawTotalPrice = apiBooking.total_price ?? apiBooking.totalPrice;
  let parsedPrice = parseFloat(String(rawTotalPrice));
  if (!Number.isFinite(parsedPrice)) {
      console.warn(`Invalid totalPrice value received: ${rawTotalPrice} for booking ID ${apiBooking.id}. Defaulting to 0.`);
      parsedPrice = 0;
  }
  
  const rawBookedTicketsArray = Array.isArray(apiBooking.booked_tickets) 
      ? apiBooking.booked_tickets 
      : (Array.isArray(apiBooking.bookedTickets) ? apiBooking.bookedTickets : []);

  return {
    id: String(apiBooking.id),
    eventId: String(apiBooking.event_id || apiBooking.eventId),
    userId: String(apiBooking.user_id || apiBooking.userId),
    bookingDate: parseApiDateString(apiBooking.booking_date || apiBooking.bookingDate) || new Date().toISOString(),
    eventDate: parseApiDateString(apiBooking.event_date || apiBooking.eventDate) || new Date().toISOString(),
    eventName: apiBooking.event_name || apiBooking.eventName || "N/A",
    eventLocation: apiBooking.event_location || apiBooking.eventLocation || "N/A",
    qrCodeValue: apiBooking.qr_code_value || apiBooking.qrCodeValue || `BOOKING:${apiBooking.id}`,
    totalPrice: parsedPrice,
    billingAddress: parsedBillingAddress,
    payment_status: apiBooking.payment_status || 'pending',
    bookedTickets: rawBookedTicketsArray.map((bt: RawApiBookedTicket) => ({
      id: String(bt.id),
      bookingId: String(bt.booking_id || bt.bookingId || apiBooking.id),
      ticketTypeId: String(bt.ticket_type_id || bt.ticketTypeId),
      ticketTypeName: bt.ticket_type_name || bt.ticketTypeName || "N/A",
      showTimeId: String(bt.show_time_id || bt.showTimeId || 'unknown-showtime-id'),
      quantity: parseInt(String(bt.quantity), 10) || 0,
      pricePerTicket: parseFloat(String(bt.price_per_ticket || bt.pricePerTicket)) || 0,
      eventNsid: String(bt.event_nsid || apiBooking.event_slug || bt.eventId || 'unknown-event-nsid'),
      createdAt: parseApiDateString(bt.created_at || bt.createdAt),
      updatedAt: parseApiDateString(bt.updated_at || bt.updatedAt),
    })),
    showtime: apiBooking.showtime,
    tickettype: apiBooking.tickettype,
    createdAt: parseApiDateString(apiBooking.created_at || apiBooking.createdAt),
    updatedAt: parseApiDateString(apiBooking.updated_at || apiBooking.updatedAt),
  };
};

export const createBooking = async (
  bookingData: {
    userId: string;
    cart: CartItem[];
    totalPrice: number;
    billingAddress: BillingAddress;
  }
): Promise<string> => {
  if (!BOOKINGS_API_URL) {
    throw new Error("BOOKINGS_API_URL is not configured.");
  }
  const { userId, cart, totalPrice, billingAddress } = bookingData;

  const uniqueEventIds = [...new Set(cart.map(item => item.eventId))];

  const apiPayload = {
    userId: parseInt(userId, 10),
    totalPrice: totalPrice,
    eventName: cart.length > 1 ? `Multi-Event Package (${new Date().toLocaleDateString()})` : cart[0].eventName,
    eventDate: format(new Date(), "yyyy-MM-dd"),
    eventLocation: (await getEventBySlug(cart[0].eventNsid))?.location || "N/A",
    qrCodeValue: `BOOK-${new Date().getFullYear()}-MULTI-${generateId()}`,
    payment_status: "pending",
    billing_email: billingAddress.email,
    billing_phone_number: billingAddress.phone_number,
    billing_street: billingAddress.street,
    billing_city: billingAddress.city,
    billing_state: billingAddress.state,
    billing_postal_code: billingAddress.postalCode,
    billing_country: billingAddress.country,
    booking_event: uniqueEventIds.map(id => ({
      eventId: parseInt(id, 10)
    })),
    booking_showtime: cart.map(item => {
      if (!item.showTimeDateTime || typeof item.showTimeDateTime !== 'string') {
        console.error("Cart item is missing or has an invalid showTimeDateTime:", item);
        throw new Error(`A ticket in your cart (${item.eventName} - ${item.ticketTypeName}) is invalid. Please remove it and add it to your cart again.`);
      }
      return {
        eventId: parseInt(item.eventId, 10),
        showtime_id: parseInt(item.showTimeId, 10),
        ticket_type: item.ticketTypeName,
        tickettype_id: parseInt(item.ticketTypeId, 10),
        showtime: format(parseISO(item.showTimeDateTime), "yyyy-MM-dd HH:mm:ss"),
        ticket_count: item.quantity
      };
    })
  };

  try {
    const response = await fetch(BOOKINGS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Booking creation failed and could not parse error response.' }));
      throw new Error(errorBody.message || `API Error: ${response.status}`);
    }

    const html = await response.text();
    return html;

  } catch (error) {
    console.error("Error creating booking:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred during booking creation.");
  }
};

export const reInitiatePayment = async (bookingId: string): Promise<string> => {
  if (!BOOKINGS_API_URL) {
    throw new Error("BOOKINGS_API_URL is not configured.");
  }
  const url = `https://gotickets-server.payshia.com/bookings/initiatePayment/${bookingId}/`;
  console.log(`[reInitiatePayment] Attempting to re-initiate payment for booking ${bookingId} at: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // No body is sent, as the backend should look up the booking by its ID from the URL.
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to re-initiate payment and could not parse error response.' }));
      throw new Error(errorBody.message || `API Error re-initiating payment: ${response.status}`);
    }

    const html = await response.text();
    if (!html.toLowerCase().includes('<form')) {
      console.warn("[reInitiatePayment] Response did not contain a form. It might be an error page from the payment gateway.");
    }
    return html;

  } catch (error) {
    console.error(`Error re-initiating payment for booking ${bookingId}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while re-initiating payment.");
  }
};

export const getBookingById = async (id: string): Promise<Booking | undefined> => {
    if (!id || id === "undefined" || id === "null" || typeof id !== 'string' || id.trim() === '') {
        console.warn(`[getBookingById] Attempt to fetch booking with invalid ID: "${id}". Aborting fetch.`);
        return undefined;
    }

    const fullBookingUrl = `https://gotickets-server.payshia.com/bookings/full/${id}`;
    console.log(`[getBookingById] Fetching full booking details from: ${fullBookingUrl}`);

    try {
        const response = await fetch(fullBookingUrl);
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`Booking with ID ${id} not found (404).`);
                return undefined;
            }
            const errorBodyText = await response.text();
            console.error(`API Error fetching full booking ${id}: Status ${response.status}, Body: ${errorBodyText}`);
            return undefined;
        }

        const responseData = await response.json();
        if (!responseData.success || !responseData.booking) {
            console.error("API response was not successful or did not contain a 'booking' object.", responseData);
            return undefined;
        }

        const apiBooking = responseData.booking;
        
        const billingInfo = apiBooking.user_billing_info || {};
        const billingAddress: BillingAddress = {
            email: billingInfo.billing_email || "",
            phone_number: billingInfo.billing_phone_number || "",
            street: billingInfo.billing_street || "",
            city: billingInfo.billing_city || "",
            state: billingInfo.billing_state || "",
            postalCode: billingInfo.billing_postal_code || "",
            country: billingInfo.billing_country || "",
        };

        const bookedTickets: BookedTicket[] = [];
        if (Array.isArray(apiBooking.booking_event)) {
            for (const event of apiBooking.booking_event) {
                if(Array.isArray(event.booking_showtime)) {
                    for (const ticket of event.booking_showtime) {
                        const eventDetails = await fetchEventByIdFromApi(String(event.eventId));
                        bookedTickets.push({
                            id: String(ticket.id),
                            bookingId: String(ticket.booking_id),
                            ticketTypeId: String(ticket.tickettype_id),
                            ticketTypeName: ticket.ticket_type,
                            showTimeId: String(ticket.showtime_id),
                            quantity: parseInt(ticket.ticket_count, 10) || 0,
                            pricePerTicket: 0,
                            eventNsid: eventDetails?.slug || '',
                            createdAt: parseApiDateString(ticket.created_at),
                            updatedAt: parseApiDateString(ticket.updated_at),
                        });
                    }
                }
            }
        }
        
        const firstEventId = apiBooking.booking_event?.[0]?.eventId || 'N/A';
        const eventDetailsForBooking = await fetchEventByIdFromApi(String(firstEventId));
        const userDetails = await getUserById(String(apiBooking.userId));

        const appBooking: Booking = {
            id: String(apiBooking.id),
            userId: String(apiBooking.userId),
            userName: userDetails?.name,
            totalPrice: parseFloat(apiBooking.totalPrice) || 0,
            bookingDate: parseApiDateString(apiBooking.bookingDate) || new Date().toISOString(),
            eventName: eventDetailsForBooking?.name || apiBooking.eventName,
            eventDate: parseApiDateString(apiBooking.eventDate) || new Date().toISOString(),
            eventLocation: eventDetailsForBooking?.location || apiBooking.eventLocation,
            qrCodeValue: apiBooking.qrCodeValue,
            payment_status: apiBooking.payment_status || 'pending',
            createdAt: parseApiDateString(apiBooking.createdAt),
            updatedAt: parseApiDateString(apiBooking.updatedAt),
            billingAddress: billingAddress,
            bookedTickets: bookedTickets,
            eventId: String(firstEventId),
        };

        return appBooking;

    } catch (error) {
        console.error(`Network or other error fetching full booking ${id}:`, error);
        return undefined;
    }
};

export const adminGetAllBookings = async (): Promise<Booking[]> => {
  console.log(`Attempting to fetch all admin bookings from: ${BOOKINGS_API_URL}`);
  try {
    const response = await fetch(BOOKINGS_API_URL);
    if (!response.ok) {
      let errorBodyText = 'Could not retrieve error body.';
      try {
        errorBodyText = await response.text();
      } catch {
        console.error("Failed to even get text from error response:");
      }
      console.error("API Error fetching all admin bookings. Status:", response.status, "Body:", errorBodyText);
      let errorBodyJsonMessage = 'Failed to parse error JSON.';
      try {
        const errorJson = JSON.parse(errorBodyText);
        errorBodyJsonMessage = errorJson.message || JSON.stringify(errorJson);
      } catch {}
      throw new Error(`Failed to fetch bookings: ${response.status}. Message: ${errorBodyJsonMessage}`);
    }

    const responseData = await response.json();
    const apiBookings: RawApiBooking[] = Array.isArray(responseData)
      ? responseData
      : responseData.data || responseData.bookings || [];

    if (!Array.isArray(apiBookings)) {
        console.error("Bookings data from API is not an array and not under a known key (data, bookings). Received:", apiBookings);
        return [];
    }

    console.log(`Found ${apiBookings.length} bookings from API. Mapping now...`);

    const mappedBookingsPromises = apiBookings.map(async (bookingData) => {
      try {
        return getBookingById(String(bookingData.id));
      } catch (mapError) {
        console.error("Error mapping individual booking in adminGetAllBookings:", JSON.stringify(bookingData, null, 2), "Error:", mapError);
        return null;
      }
    });

    const resolvedBookings = (await Promise.all(mappedBookingsPromises)).filter(Boolean) as Booking[];
    console.log(`Successfully mapped ${resolvedBookings.length} bookings with line items.`);
    return resolvedBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

  } catch (error) {
    console.error("Network or other error fetching/processing all admin bookings:", error);
    return [];
  }
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  if (!BOOKINGS_API_URL) {
    console.error("BOOKINGS_API_URL is not defined. Cannot fetch user bookings.");
    return [];
  }
  const url = `${BOOKINGS_API_URL}/user/${userId}`;
  console.log(`[getUserBookings] Fetching bookings for user ID ${userId} from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getUserBookings] No bookings found for user ${userId} (404).`);
        return [];
      }
      const errorBodyText = await response.text();
      console.error(`[getUserBookings] API Error fetching bookings for user ${userId}. Status: ${response.status}, Body: ${errorBodyText}`);
      return [];
    }
    const apiBookings: RawApiBooking[] = await response.json();
    if (!Array.isArray(apiBookings)) {
      console.error(`[getUserBookings] Expected array of bookings for user ${userId}, got:`, apiBookings);
      return [];
    }
    console.log(`[getUserBookings] Found ${apiBookings.length} bookings for user ${userId}. Mapping now...`);
    
    const mappedBookingsPromises = apiBookings.map(async (bookingData) => {
        return getBookingById(String(bookingData.id));
    });

    const resolvedBookings = (await Promise.all(mappedBookingsPromises)).filter(Boolean) as Booking[];
    return resolvedBookings.sort((a,b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());

  } catch (error) {
    console.error(`[getUserBookings] Network or other error fetching bookings for user ${userId}:`, error);
    return [];
  }
};

export const getBookingByQrCode = async (qrCodeValue: string): Promise<Booking | undefined> => {
  if (!qrCodeValue) {
    console.warn("[getBookingByQrCode] Called with empty qrCodeValue.");
    return undefined;
  }
  if (!BOOKINGS_API_URL) {
    console.error("[getBookingByQrCode] BOOKINGS_API_URL is not defined.");
    return undefined;
  }

  const url = `${BOOKINGS_API_URL}/?qrvalue=${encodeURIComponent(qrCodeValue)}`;
  console.log(`[getBookingByQrCode] Fetching booking by QR code from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getBookingByQrCode] Booking with qrCodeValue ${qrCodeValue} not found (404).`);
        return undefined;
      }
      const errorBodyText = await response.text();
      console.error(`[getBookingByQrCode] API Error fetching booking by QR. Status: ${response.status}, Body: ${errorBodyText}`);
      return undefined;
    }

    const responseData = await response.json();
    
    const apiBooking: RawApiBooking | undefined = Array.isArray(responseData) ? responseData[0] : responseData;

    if (!apiBooking || Object.keys(apiBooking).length === 0) {
      console.log(`[getBookingByQrCode] No booking found for qrCodeValue: ${qrCodeValue}`);
      return undefined;
    }

    console.log(`[getBookingByQrCode] Found booking ID ${apiBooking.id} for QR value. Fetching full details.`);
    return getBookingById(String(apiBooking.id));

  } catch (error) {
    console.error(`[getBookingByQrCode] Network or other error fetching booking by QR:`, error);
    return undefined;
  }
};
