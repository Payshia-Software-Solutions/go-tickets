
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  let eventDate: Date;
  try {
    eventDate = typeof event.date === 'string' ? parseISO(event.date) : new Date(event.date);
  } catch (error) {
    eventDate = new Date(); 
    console.warn("Failed to parse event date:", event.date, error);
  }

  const formattedDayMonthYear = format(eventDate, "d, MMMM yyyy"); // e.g., 12, July 2025
  const formattedTime = format(eventDate, "p"); // e.g., 7:00 PM

  const minPrice = event.ticketTypes && event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map(t => t.price))
    : null;

  // Use venue.name if available, otherwise fallback to location
  const displayLocation = event.venue?.name || event.location;

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
      <Link href={`/events/${event.slug}`} aria-label={`View details for ${event.name}`}>
        <div className="relative w-full h-60 md:h-56"> {/* Adjusted height */}
          <Image
            src={event.imageUrl || "https://placehold.co/400x300.png"} // Fallback image
            alt={event.name}
            fill
            style={{objectFit: 'cover'}}
            className="rounded-t-xl" // Apply rounding to image container if card doesn't clip
            data-ai-hint="event concert festival"
          />
        </div>
      </Link>

      <CardContent className="p-4 flex-grow flex flex-col space-y-1.5"> {/* Reduced space-y */}
        <p className="text-primary font-medium text-[0.9rem]"> {/* Slightly smaller than base */}
          {formattedDayMonthYear}
        </p>
        <p className="text-primary font-medium text-[0.9rem] -mt-1"> {/* Negative margin to bring closer */}
          {formattedTime}
        </p>

        <h3 className="text-lg font-semibold text-foreground truncate pt-1">{event.name}</h3>
        
        <p className="text-muted-foreground text-sm truncate">{displayLocation}</p>
        
        <p className="text-muted-foreground text-xs pt-0.5">{event.category}</p>
      </CardContent>

      <CardFooter className="p-4 flex justify-between items-center border-t mt-auto">
        <div className="text-left">
          <p className="text-xs text-muted-foreground">Tickets</p>
          {minPrice !== null ? (
            <p className="text-md font-semibold text-foreground">
              {minPrice === 0 ? 'Free' : `${minPrice.toFixed(0)} LKR`} Upwards
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">See Details</p> 
          )}
        </div>
        <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md px-3 py-1.5 h-auto">
          <Link href={`/events/${event.slug}`}>
            Book Now <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
