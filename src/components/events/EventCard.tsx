
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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

  // Use venueName if available, otherwise fallback to location
  const displayLocation = event.venueName || event.location;
  const canBook = event.accept_booking === '1';

  return (
    <Card className="flex flex-col overflow-hidden h-full hover:shadow-xl transition-shadow duration-300 rounded-[25px] border-none">
      <Link href={`/events/${event.slug}`} aria-label={`View details for ${event.name}`} className="relative">
        <div className="relative w-full aspect-square">
          <Image
            src={event.imageUrl || "https://placehold.co/400x400.png"} // Fallback image
            alt={event.name}
            fill
            style={{objectFit: 'cover'}}
            className="rounded-t-[25px]" 
            data-ai-hint="event concert festival"
          />
           {!canBook && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-[25px]">
                  <Badge variant="destructive" className="text-lg px-4 py-2">SOLD OUT</Badge>
              </div>
            )}
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
          {minPrice !== null && canBook ? (
            <p className="text-md font-semibold text-foreground">
              {minPrice === 0 ? 'Free' : `${minPrice.toFixed(0)} LKR`} Upwards
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{canBook ? 'See Details' : 'Unavailable'}</p> 
          )}
        </div>
        {canBook ? (
            <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md px-3 py-1.5 h-auto">
                <Link href={`/events/${event.slug}`}>
                    Book Now <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
            </Button>
        ) : (
             <Button asChild size="sm" variant="secondary" disabled>
                <Link href={`/events/${event.slug}`}>
                    Sold Out <Ban className="ml-1 h-4 w-4" />
                </Link>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default EventCard;
