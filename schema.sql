
-- Users Table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress_street" TEXT,
    "billingAddress_city" TEXT,
    "billingAddress_state" TEXT,
    "billingAddress_postalCode" TEXT,
    "billingAddress_country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP -- In many DBs, this needs a trigger or application-level update
);

-- Organizers Table
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "date" TIMESTAMP(3) NOT NULL, -- Main event date
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT,
    "venueMapLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- TicketTypes Table (Templates for ticket properties)
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL, -- Using REAL for float/decimal, adjust as needed (e.g., DECIMAL(10,2))
    "availability" INTEGER NOT NULL, -- Template/default availability
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ShowTimes Table
CREATE TABLE "ShowTime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShowTime_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ShowTimeTicketAvailability Table (Links ShowTime and TicketType with specific availability)
CREATE TABLE "ShowTimeTicketAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "showTimeId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShowTimeTicketAvailability_showTimeId_fkey" FOREIGN KEY ("showTimeId") REFERENCES "ShowTime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShowTimeTicketAvailability_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, -- RESTRICT delete if bookings exist
    UNIQUE ("showTimeId", "ticketTypeId")
);

-- Bookings Table
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL, -- Main event ID for easier querying, though specific showtime is key
    "userId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventDate" TIMESTAMP(3) NOT NULL, -- Actual date and time of the booked showtime
    "eventName" TEXT NOT NULL, -- Denormalized
    "eventLocation" TEXT NOT NULL, -- Denormalized
    "qrCodeValue" TEXT NOT NULL,
    "totalPrice" REAL NOT NULL,
    "billingAddress_street" TEXT NOT NULL,
    "billingAddress_city" TEXT NOT NULL,
    "billingAddress_state" TEXT NOT NULL,
    "billingAddress_postalCode" TEXT NOT NULL,
    "billingAddress_country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- BookedTickets Table (Line items for a booking)
CREATE TABLE "BookedTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "showTimeId" TEXT NOT NULL, -- Crucial link to the specific showtime
    "ticketTypeName" TEXT NOT NULL, -- Denormalized
    "quantity" INTEGER NOT NULL,
    "pricePerTicket" REAL NOT NULL, -- Price at the time of booking
    "eventNsid" TEXT NOT NULL, -- Denormalized event slug
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookedTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookedTicket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookedTicket_showTimeId_fkey" FOREIGN KEY ("showTimeId") REFERENCES "ShowTime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes for frequently queried columns (examples)
CREATE INDEX "idx_event_slug" ON "Event"("slug");
CREATE INDEX "idx_event_date" ON "Event"("date");
CREATE INDEX "idx_event_category" ON "Event"("category");
CREATE INDEX "idx_user_email" ON "User"("email");
CREATE INDEX "idx_booking_userId" ON "Booking"("userId");
CREATE INDEX "idx_booking_eventId" ON "Booking"("eventId");
CREATE INDEX "idx_showtime_eventId" ON "ShowTime"("eventId");
CREATE INDEX "idx_tickettype_eventId" ON "TicketType"("eventId");

-- Note on IDs: The Prisma schema uses `String @id @default(cuid())`.
-- CUIDs are application-generated. SQL `PRIMARY KEY` on a TEXT/VARCHAR column is used here.
-- `updatedAt` behavior: Prisma handles this. For raw SQL, this might require triggers or be managed at the application level.
-- For MySQL, you could add `ON UPDATE CURRENT_TIMESTAMP` to `updatedAt` columns.
-- For PostgreSQL, you'd typically use a trigger function.
-- For simplicity, this schema relies on application logic or Prisma to manage `updatedAt` updates beyond the initial default.
    