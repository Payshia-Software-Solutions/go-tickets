
-- Users Table
CREATE TABLE User (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    isAdmin BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Organizers Table
CREATE TABLE Organizer (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contactEmail VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE Event (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    date TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255) NOT NULL,
    imageUrl VARCHAR(2048) NOT NULL, -- Increased length for potential data URIs or long URLs
    venueName VARCHAR(255) NOT NULL,
    venueAddress VARCHAR(255),
    organizerId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizerId) REFERENCES Organizer(id) ON DELETE RESTRICT ON UPDATE CASCADE -- Or ON DELETE CASCADE if organizers can be deleted with events
);

-- TicketTypes Table
CREATE TABLE TicketType (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    availability INTEGER NOT NULL,
    description TEXT,
    eventId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES Event(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Bookings Table
CREATE TABLE Booking (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    eventId VARCHAR(255) NOT NULL,
    totalPrice DECIMAL(10, 2) NOT NULL,
    bookingDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eventName VARCHAR(255) NOT NULL,
    eventDate TIMESTAMP NOT NULL,
    eventLocation VARCHAR(255) NOT NULL,
    qrCodeValue TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE RESTRICT ON UPDATE CASCADE, -- Or appropriate action
    FOREIGN KEY (eventId) REFERENCES Event(id) ON DELETE RESTRICT ON UPDATE CASCADE -- Or appropriate action
);

-- BookedTickets Table (Join table for tickets in a booking, if tickets have individual properties or many-to-many structure in a different scenario)
-- Based on your Prisma schema, this represents the items within a single booking.
CREATE TABLE BookedTicket (
    id VARCHAR(255) PRIMARY KEY,
    bookingId VARCHAR(255) NOT NULL,
    eventNsid VARCHAR(255) NOT NULL, -- Likely the event slug, for reference
    ticketTypeId VARCHAR(255) NOT NULL, -- Reference to a TicketType ID (though not explicitly a foreign key if TicketTypes can change/be deleted after booking)
    ticketTypeName VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    pricePerTicket DECIMAL(10, 2) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingId) REFERENCES Booking(id) ON DELETE CASCADE ON UPDATE CASCADE
    -- If ticketTypeId directly referenced TicketType(id) ensure ON DELETE SET NULL or other handling if TicketTypes can be deleted
);

-- Add Indexes for performance (example)
CREATE INDEX idx_event_date ON Event(date);
CREATE INDEX idx_event_category ON Event(category);
CREATE INDEX idx_booking_userId ON Booking(userId);
CREATE INDEX idx_booking_eventId ON Booking(eventId);
    