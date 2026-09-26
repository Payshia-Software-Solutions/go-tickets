import { BOOKINGS_COUNT_API_URL, EVENTS_COUNT_API_URL, USERS_COUNT_API_URL } from '@/lib/constants';

export const getEventCount = async (): Promise<number> => {
  if (!EVENTS_COUNT_API_URL) return 0;
  try {
    const response = await fetch(EVENTS_COUNT_API_URL);
    if (!response.ok) throw new Error('Failed to fetch event count');
    const data = await response.json();
    return parseInt(data.totalEvents, 10) || 0;
  } catch (error) {
    console.error("Error fetching event count:", error);
    return 0;
  }
};

export const getBookingCount = async (): Promise<number> => {
  if (!BOOKINGS_COUNT_API_URL) return 0;
  try {
    const response = await fetch(BOOKINGS_COUNT_API_URL);
    if (!response.ok) throw new Error('Failed to fetch booking count');
    const data = await response.json();
    return parseInt(data.totalBookings, 10) || 0;
  } catch (error) {
    console.error("Error fetching booking count:", error);
    return 0;
  }
};

export const getUserCount = async (): Promise<number> => {
  if (!USERS_COUNT_API_URL) return 0;
  try {
    const response = await fetch(USERS_COUNT_API_URL);
    if (!response.ok) throw new Error('Failed to fetch user count');
    const data = await response.json();
    return parseInt(data.totalUsers, 10) || 0;
  } catch (error) {
    console.error("Error fetching user count:", error);
    return 0;
  }
};
