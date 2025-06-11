
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, User } from 'lucide-react'; // Replaced Tag with User for organizer
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // API returns date as "YYYY-MM-DD HH:MM:SS" or already parsed to ISO string by mapping function
  // Ensure `event.date` is a valid string for parseISO or already a Date object.
  let eventDate: Date;
  try {
    eventDate = typeof event.date === 'string' ? parseISO(event.date) : new Date(event.date);
  } catch (error) {
    eventDate = new Date(); // Fallback, should not happen if data is clean
    console.warn("Failed to parse event date:", event.date, error);
  }

  const formattedDate = format(eventDate, "PPP"); // e.g., June 15th, 2025
  const formattedTime = format(eventDate, "p"); // e.g., 7:30 PM

  // Min price calculation:
  // The /events list endpoint doesn't seem to provide ticketTypes.
  // So, we can't calculate minPrice reliably for the card from that list.
  // This logic will only work if event.ticketTypes is populated (e.g., from a detailed event fetch).
  const minPrice = event.ticketTypes && event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map(t => t.price))
    : null;

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Link href={`/events/${event.slug}`} aria-label={`View details for ${event.name}`}>
          <Image
            src={event.imageUrl || "https://placehold.co/400x250.png"} // Fallback image
            alt={event.name}
            width={400}
            height={250}
            className="w-full h-48 object-cover"
            data-ai-hint="event concert"
          />
        </Link>
         <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">{event.category}</Badge>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/events/${event.slug}`} aria-label={`View details for ${event.name}`}>
          <CardTitle className="text-xl font-headline mb-2 hover:text-primary transition-colors truncate">{event.name}</CardTitle>
        </Link>
        <div className="text-sm text-muted-foreground space-y-1.5">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-primary" />
            <span>{formattedDate} at {formattedTime}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-primary" />
            <span className="truncate">{event.location}</span>
          </div>
          {/* Display Organizer ID if full organizer object isn't available */}
          {event.organizer ? (
            <div className="flex items-center">
              <User className="mr-2 h-4 w-4 text-primary" />
              <span className="truncate">{event.organizer.name}</span>
            </div>
          ) : event.organizerId ? (
             <div className="flex items-center text-xs">
              <User className="mr-2 h-3 w-3 text-primary" />
              <span className="truncate">Organizer ID: {event.organizerId}</span>
            </div>
          ): null}
        </div>
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center border-t">
         {minPrice !== null && event.ticketTypes && event.ticketTypes.length > 0 ? (
          <div className="flex items-center text-lg font-semibold text-primary">
            <span className="mr-1 text-sm">LKR</span>
            <span>{minPrice.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">onwards</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">See Details</div> // Placeholder if no price info
        )}
        <Button asChild size="sm">
          <Link href={`/events/${event.slug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
