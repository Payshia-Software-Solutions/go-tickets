
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { MapPin, CalendarDays, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: Event;
  index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
  let eventDate: Date;
  try {
    eventDate = typeof event.date === 'string' ? parseISO(event.date) : new Date(event.date);
  } catch (error) {
    eventDate = new Date();
    console.warn("Failed to parse event date:", event.date, error);
  }

  const formattedDate = format(eventDate, "EEE, MMM d · h:mm a");

  const minPrice = event.ticketTypes && event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map(t => t.price))
    : null;

  const displayLocation = event.venueName || event.location;
  const canBook = String(event.accept_booking) === '1';

  return (
    <div
      className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full animate-card-enter"
      style={{ animationDelay: `${(index % 12) * 0.12}s` }}
    >
      {/* Image */}
      <Link href={`/events/${event.slug}`} className="relative block w-full aspect-square overflow-hidden bg-muted">
        <Image
          src={event.imageUrl || "https://placehold.co/600x338.png"}
          alt={event.name}
          fill
          style={{ objectFit: 'cover' }}
          className="transition-transform duration-300 group-hover:scale-105"
          data-ai-hint="event concert festival"
        />
        {/* Sold Out Overlay */}
        {!canBook && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="bg-destructive text-white text-sm font-bold px-4 py-1.5 rounded-full tracking-wide">
              SOLD OUT
            </span>
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 text-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
            {event.category}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-grow p-3 sm:p-4 gap-1.5 sm:gap-2">
        <p className="text-primary text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5">
          <CalendarDays className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0" />
          {formattedDate}
        </p>

        <Link href={`/events/${event.slug}`}>
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
            {event.name}
          </h3>
        </Link>

        <p className="text-muted-foreground text-[10px] sm:text-sm flex items-center gap-1 sm:gap-1.5 truncate mt-auto">
          <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0 text-accent" />
          {displayLocation}
        </p>
      </div>

      {/* Footer */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-center justify-between border-t border-border pt-2.5 sm:pt-3">
        <div>
          {minPrice !== null && canBook ? (
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">From</p>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                {minPrice === 0 ? 'Free' : `LKR ${minPrice.toLocaleString('en-US')}`}
              </p>
            </div>
          ) : (
            <p className="text-[10px] sm:text-sm text-muted-foreground">{canBook ? 'See details' : 'Unavailable'}</p>
          )}
        </div>
        {canBook ? (
          <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-white rounded-lg px-2.5 sm:px-4 h-7 sm:h-8 text-[10px] sm:text-sm font-semibold">
            <Link href={`/events/${event.slug}`}>Get Tickets</Link>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled className="rounded-lg px-2.5 sm:px-4 h-7 sm:h-8 text-[10px] sm:text-sm">
            <Ban className="mr-1 sm:mr-1.5 h-3 sm:h-3.5 w-3 sm:w-3.5" /> Sold Out
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventCard;

