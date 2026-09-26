
// API Base URL from environment variable
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://gotickets-server.payshia.com';
export const CONTENT_PROVIDER_URL = "https://content-provider.gotickets.lk";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Ensure base doesn't have a trailing slash for clean concatenation
const base = API_BASE_URL.replace(/\/$/, "");

// Endpoints derived from the base URL
export const EXTERNAL_CATEGORY_API_URL = `${base}/categories`;
export const INTERNAL_PUBLIC_CATEGORY_API_URL = "/api/public-categories";
export const BOOKINGS_API_URL = `${base}/bookings`;
export const ORGANIZERS_API_URL = `${base}/organizers`;
export const USERS_API_URL = `${base}/users`;
export const USER_LOGIN_API_URL = `${base}/users/login`;
export const SHOWTIMES_API_URL = `${base}/showtimes`;
export const SHOWTIMES_BY_EVENT_API_URL_BASE = `${base}/showtimes/event`;
export const TICKET_TYPES_API_URL = `${base}/ticket-types`;

// Count URLs
export const EVENTS_COUNT_API_URL = `${base}/events/get/count`;
export const BOOKINGS_COUNT_API_URL = `${base}/bookings/get/count`;
export const USERS_COUNT_API_URL = `${base}/users/get/count`;
