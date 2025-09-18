
// API Base URL from environment variable
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export const CONTENT_PROVIDER_URL = "https://content-provider.gotickets.lk";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Endpoints
export const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";
export const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
export const BOOKINGS_API_URL = "https://gotickets-server.payshia.com/bookings";
export const ORGANIZERS_API_URL = "https://gotickets-server.payshia.com/organizers";
export const USERS_API_URL = "https://gotickets-server.payshia.com/users";
export const USER_LOGIN_API_URL = "https://gotickets-server.payshia.com/users/login";
export const SHOWTIMES_API_URL = "https://gotickets-server.payshia.com/showtimes";
export const SHOWTIMES_BY_EVENT_API_URL_BASE = "https://gotickets-server.payshia.com/showtimes/event";
export const TICKET_TYPES_API_URL = "https://gotickets-server.payshia.com/ticket-types";

// Count URLs
export const EVENTS_COUNT_API_URL = "https://gotickets-server.payshia.com/events/get/count";
export const BOOKINGS_COUNT_API_URL = "https://gotickets-server.payshia.com/bookings/get/count";
export const USERS_COUNT_API_URL = "https://gotickets-server.payshia.com/users/get/count";
