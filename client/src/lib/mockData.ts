// This file is now a re-exporter for the new service files.
// This preserves all import paths throughout the application,
// making the refactor less intrusive.

export * from './services/api.service';
export * from './services/booking.service';
export * from './services/category.service';
export * from './services/dashboard.service';
export * from './services/event.service';
export * from './services/organizer.service';
export * from './services/showtime.service';
export * from './services/ticket.service';
export * from './services/user.service';

// You can add back specific mock-only logic here if needed,
// for example, functions that are only used for local testing
// and don't interact with an API.

