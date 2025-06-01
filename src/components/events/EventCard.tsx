
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const minPrice = event.ticketTypes.length > 0 
    ? Math.min(...event.ticketTypes.map(t => t.price))
    : null;

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Link href={`/events/${event.slug}`} aria-label={`View details for ${event.name}`}>
          <Image
            src={event.imageUrl}
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
        </div>
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center border-t">
         {minPrice !== null ? (
          <div className="flex items-center text-lg font-semibold text-primary">
            <span className="mr-1 text-sm">LKR</span>
            <span>{minPrice.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">onwards</span>
          </div>
        ) : (
          <div /> // Placeholder for alignment if no price
        )}
        <Button asChild size="sm">
          <Link href={`/events/${event.slug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
