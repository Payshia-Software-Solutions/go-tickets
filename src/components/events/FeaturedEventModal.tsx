
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Event } from '@/lib/types';
import { Ticket, Zap, CalendarDays, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface FeaturedEventModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  event: Event | null;
}

const FeaturedEventModal: FC<FeaturedEventModalProps> = ({ isOpen, onOpenChange, event }) => {
  if (!event) {
    return null;
  }
  
  const safeParseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      // Handle both ISO strings and "YYYY-MM-DD HH:MM:SS" formats
      const parsed = parseISO(dateStr);
      // Check if parsing was successful
      if (isNaN(parsed.getTime())) {
          // Fallback for non-ISO formats
          const parts = dateStr.split(/[\s:-]/);
          if (parts.length >= 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]),
                            parseInt(parts[3]) || 0, parseInt(parts[4]) || 0, parseInt(parts[5]) || 0);
          }
          return null;
      }
      return parsed;
    } catch (e) {
      console.warn(`Could not parse date: ${dateStr}`, e);
      return null;
    }
  };

  const eventDate = safeParseDate(event.date);
  const formattedDate = eventDate ? format(eventDate, "EEEE, MMMM do, yyyy") : "Date not available";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm md:max-w-4xl p-0 overflow-hidden grid md:grid-cols-2 gap-0">
        <div className="relative w-full aspect-square bg-muted/50">
           <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-contain"
              data-ai-hint="event concert festival"
            />
        </div>
        <div className="p-6 flex flex-col justify-between">
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-bold font-headline">{event.name}</DialogTitle>
                <DialogDescription className="text-destructive font-semibold flex items-center gap-2 pt-1">
                    <Zap className="h-5 w-5 animate-pulse" /> Hurry Up! Tickets Almost Sold Out!
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex items-center text-sm">
                    <CalendarDays className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{formattedDate}</span>
                </div>
                 <div className="flex items-center text-sm">
                    <MapPin className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{event.venueName || event.location}</span>
                </div>
                <p className="text-muted-foreground text-sm pt-2">
                    Don't miss out on one of the hottest events of the year. Grab your tickets before they're all gone.
                </p>
            </div>
            <DialogFooter className="flex-col sm:flex-col sm:items-stretch sm:justify-end gap-2">
                 <Button asChild type="button" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={`/events/${event.slug}/book`} onClick={() => onOpenChange(false)}>
                    <Ticket className="mr-2 h-4 w-4"/>
                    Buy Tickets Now
                    </Link>
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FeaturedEventModal;
