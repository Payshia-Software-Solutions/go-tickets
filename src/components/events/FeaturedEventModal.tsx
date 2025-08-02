
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Event } from '@/lib/types';
import { Ticket, Zap, CalendarDays, MapPin, Ban } from 'lucide-react';
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
  const canBook = event.accept_booking === '1';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="grid w-[calc(100vw-2rem)] max-w-sm gap-0 overflow-hidden rounded-lg p-0 md:max-w-2xl md:grid-cols-2">
        <div className="relative aspect-square w-full bg-muted/50">
           <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
              data-ai-hint="event concert festival"
            />
        </div>
        <div className="flex flex-col justify-between p-4">
            <DialogHeader className="text-left">
                <DialogTitle className="font-headline text-xl font-bold">{event.name}</DialogTitle>
                <DialogDescription asChild>
                    <div className="space-y-2 pt-2">
                        <p className="flex items-center justify-center gap-2 font-semibold text-red-500 dark:text-red-400">
                            <Zap className="h-5 w-5 animate-pulse" /> Hurry Up! Tickets are selling fast!
                        </p>
                        <div className="text-center">
                            <span className="block text-5xl font-extrabold leading-tight text-accent">50%</span>
                            <span className="text-sm text-muted-foreground">of tickets already sold!</span>
                        </div>
                    </div>
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
                <div className="flex items-center text-xs">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{formattedDate}</span>
                </div>
                 <div className="flex items-center text-xs">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{event.venueName || event.location}</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                    Don't miss out on one of the hottest events of the year. Grab your tickets before they're all gone.
                </p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-end">
                 {canBook ? (
                    <Button asChild type="button" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link href={`/events/${event.slug}/book`} onClick={() => onOpenChange(false)}>
                        <Ticket className="mr-2 h-4 w-4"/>
                        Buy Tickets Now
                        </Link>
                    </Button>
                 ) : (
                    <Button type="button" disabled className="w-full">
                        <Ban className="mr-2 h-4 w-4"/>
                        Sold Out
                    </Button>
                 )}
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FeaturedEventModal;
