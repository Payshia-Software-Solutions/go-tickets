
"use client";

import React from 'react';
import type { Booking } from '@/lib/types';
import QRCode from '@/components/QRCode';
import { Ticket, Calendar, Clock, MapPin, User, Hash } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const PrintableTicket = React.forwardRef<HTMLDivElement, { booking: Booking, formattedDate: string, formattedTime: string }>(({ booking, formattedDate, formattedTime }, ref) => {
    const totalTickets = booking.bookedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);

    return (
        // This is the element that will be converted to an image.
        // It's styled with inline styles and Tailwind classes to be self-contained.
        // A fixed width is important for consistent output.
        <div
            ref={ref}
            className="w-[350px] bg-card text-card-foreground font-sans border border-border rounded-xl shadow-lg flex flex-col"
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            {/* Header Section */}
            <div className="bg-primary text-primary-foreground p-4 rounded-t-xl flex items-center justify-between">
                <h2 className="text-xl font-bold font-headline">GoTickets.lk</h2>
                <Ticket className="h-6 w-6" />
            </div>

            {/* Main Content */}
            <div className="p-4 flex-grow">
                <h3 className="text-2xl font-bold text-primary truncate mb-1">{booking.eventName}</h3>
                <p className="text-sm text-muted-foreground mb-4">Official Event Ticket</p>

                <div className="space-y-3 text-sm mb-4">
                     <div className="flex items-start">
                        <Calendar className="h-4 w-4 mr-2 mt-0.5 text-accent shrink-0" />
                        <div>
                            <p className="font-semibold">Date & Time</p>
                            <p className="text-muted-foreground">{formattedDate} at {formattedTime}</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-accent shrink-0" />
                        <div>
                            <p className="font-semibold">Venue</p>
                            <p className="text-muted-foreground">{booking.eventLocation}</p>
                        </div>
                    </div>
                </div>
                
                <Separator className="my-4"/>

                {/* Attendee and Ticket Info */}
                <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-accent" />
                        <div>
                            <p className="font-semibold">Attendee</p>
                            <p className="text-muted-foreground">{booking.userName || 'Guest'}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Hash className="h-4 w-4 mr-2 text-accent" />
                        <div>
                            <p className="font-semibold">Booking ID</p>
                            <p className="text-muted-foreground font-mono text-xs">{booking.id}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* QR Code and Ticket List Section */}
            <div className="bg-muted/30 p-4 border-t border-dashed flex items-center gap-4">
                 <div className="shrink-0">
                    <QRCode data={booking.qrCodeValue} size={100} />
                </div>
                <div className="flex-grow overflow-hidden">
                    <p className="font-bold text-sm mb-1">{totalTickets} Ticket{totalTickets > 1 ? 's' : ''}</p>
                    <ul className="text-xs space-y-0.5 text-muted-foreground list-disc list-inside">
                        {booking.bookedTickets.map(ticket => (
                            <li key={ticket.id} className="truncate">
                                {ticket.quantity} x {ticket.ticketTypeName}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-muted/50 p-2 text-center text-xs text-muted-foreground rounded-b-xl">
                 <p>&copy; {new Date().getFullYear()} GoTickets.lk - This is your official ticket.</p>
            </div>
        </div>
    );
});
PrintableTicket.displayName = 'PrintableTicket';

export default PrintableTicket;
