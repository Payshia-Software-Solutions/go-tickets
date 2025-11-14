
"use client";

import { useEffect } from 'react';
import type { Event } from '@/lib/types';
import * as fpixel from '@/lib/fpixel';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Building, Info, Ticket as TicketIcon, Clock, Briefcase, Ban, Percent } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';

const safeParseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch (e) {
    try {
      const parts = dateStr.split(/[\s:-]/);
      if (parts.length >= 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), 
                        parseInt(parts[3]) || 0, parseInt(parts[4]) || 0, parseInt(parts[5]) || 0);
      }
    } catch (parseError) {
      console.warn(`Could not parse date string: ${dateStr}`, e, parseError);
    }
    return null;
  }
};

export default function EventDetailsClientView({ event }: { event: Event }) {
    useEffect(() => {
        fpixel.track('ViewContent', {
            content_name: event.name,
            content_category: event.category,
            content_ids: [event.id],
            content_type: 'product',
        });
    }, [event]);

    const handleFindLocationClick = () => {
        fpixel.track('FindLocation');
    };

    const mainEventDateObj = safeParseDate(event.date);
    const formattedMainEventDate = mainEventDateObj 
        ? format(mainEventDateObj, "EEEE, MMMM do, yyyy") 
        : "Date TBD";
    
    const venueName = event.venueName;
    const venueAddress = event.venueAddress;
    const venueMapLink = event.mapLink || (venueAddress ? `https://maps.google.com/?q=${encodeURIComponent(venueAddress)}` : undefined);
    const canBook = event.accept_booking === '1';

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden shadow-lg">
                    <CardHeader className="p-0">
                    <div className="relative w-full aspect-square">
                        <Image
                        src={event.imageUrl || "https://placehold.co/600x400.png"}
                        alt={event.name}
                        fill
                        className="object-cover"
                        data-ai-hint="event stage"
                        priority
                        />
                    </div>
                    </CardHeader>
                    <CardContent className="p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">{event.category}</Badge>
                         {!canBook && (
                            <Badge variant="destructive" className="animate-pulse">Bookings Closed</Badge>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold font-headline mb-4 text-primary">{event.name}</h1>
                    <div className="space-y-3 text-muted-foreground">
                        <div className="flex items-center">
                        <CalendarDays className="mr-3 h-5 w-5 text-accent" />
                        <span>Main Event Date: {formattedMainEventDate} (See specific showtimes below)</span>
                        </div>
                        <div className="flex items-center">
                        <MapPin className="mr-3 h-5 w-5 text-accent" />
                        <span>{event.location}</span>
                        </div>
                    </div>
                    </CardContent>
                    <CardFooter className="p-6 border-t">
                    {canBook ? (
                        <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href={`/events/${event.slug}/book`}>
                                <TicketIcon className="mr-2 h-5 w-5" /> Book Tickets
                            </Link>
                        </Button>
                    ) : (
                        <Button size="lg" disabled className="w-full sm:w-auto">
                            <Ban className="mr-2 h-5 w-5" /> Sold Out / Bookings Closed
                        </Button>
                    )}
                    </CardFooter>
                </Card>

                <Card className="shadow-lg">
                    <CardHeader>
                    <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-primary" /> About This Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div 
                        className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-line" 
                        dangerouslySetInnerHTML={{ __html: event.description || "<p>No description available.</p>" }} 
                    />
                    </CardContent>
                </Card>
                </div>

                <div className="space-y-6 lg:sticky lg:top-24">
                {event.organizer ? (
                    <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Organizer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold text-lg">{event.organizer.name}</p>
                        {event.organizer.contactEmail && <p className="text-sm text-muted-foreground">{event.organizer.contactEmail}</p>}
                        {event.organizer.website && (
                        <a href={event.organizer.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block">
                            Visit Website
                        </a>
                        )}
                    </CardContent>
                    </Card>
                ) : event.organizerId ? (
                    <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Organizer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Organizer ID: {event.organizerId}</p>
                        <p className="text-xs text-muted-foreground italic">(Full organizer details not loaded)</p>
                    </CardContent>
                    </Card>
                ) : null}

                <Card className="shadow-md">
                    <CardHeader>
                    <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-primary" /> Venue Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <p className="font-semibold text-lg">{venueName || "Venue TBD"}</p>
                    {venueAddress && (
                        <p className="text-sm text-muted-foreground">{venueAddress}</p>
                    )}
                    {venueMapLink && (
                        <a href={venueMapLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block" onClick={handleFindLocationClick}>
                        View on Map
                        </a>
                    )}
                    {!venueAddress && !venueMapLink && !venueName && (
                        <p className="text-sm text-muted-foreground">Detailed venue information not available.</p>
                    )}
                    </CardContent>
                </Card>

                {event.showTimes && event.showTimes.length > 0 ? (
                    <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6 text-primary" /> Showtimes &amp; Tickets</CardTitle>
                                <CardDescription>Select tickets for your preferred showtime on the booking page.</CardDescription>
                            </div>
                             <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 w-fit">
                                <Percent className="mr-1.5 h-4 w-4" /> 10% OFF Online
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {event.showTimes.map((showTime, index) => {
                        const showDateTimeObj = safeParseDate(showTime.dateTime);
                        const formattedShowDate = showDateTimeObj ? format(showDateTimeObj, "EEEE, MMMM do, yyyy") : "Date TBD";
                        const formattedShowTime = showDateTimeObj ? format(showDateTimeObj, "p") : "Time TBD";
                        return (
                            <div key={showTime.id} className="p-4 border rounded-md bg-muted/20">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold text-accent">
                                {formattedShowDate} at {formattedShowTime}
                                </h3>
                            </div>
                            {showTime.ticketAvailabilities && showTime.ticketAvailabilities.length > 0 ? (
                                <div className="space-y-2">
                                {showTime.ticketAvailabilities.map(availability => (
                                    <div key={availability.ticketType.id} className="flex justify-between items-center text-sm p-2 border-b border-border/50 last:border-b-0">
                                    <div>
                                        <p className="font-medium text-foreground">{availability.ticketType.name}</p>
                                        <p className="text-xs text-muted-foreground">LKR {availability.ticketType.price.toFixed(2)}</p>
                                    </div>
                                    <Badge variant={availability.availableCount > 0 ? "default" : "destructive"} className="font-mono hidden">
                                        {availability.availableCount > 0 ? `${availability.availableCount} available` : "Sold Out"}
                                    </Badge>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No specific ticket information for this showtime.</p>
                            )}
                            {index < event.showTimes.length - 1 && <Separator className="my-4" />}
                            </div>
                        );
                        })}
                    </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6 text-primary" /> Showtimes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">No specific showtimes listed. Check the booking page or contact the organizer.</p>
                    </CardContent>
                    </Card>
                )}
                </div>
            </div>
        </div>
    );
}
