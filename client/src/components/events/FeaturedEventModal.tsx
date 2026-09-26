"use client";

import type { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Event } from '@/lib/types';
import { Ticket, Zap, CalendarDays, MapPin, Ban, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface FeaturedEventModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  event: Event | null;
}

const FeaturedEventModal: FC<FeaturedEventModalProps> = ({ isOpen, onOpenChange, event }) => {
  if (!event) return null;

  const safeParseDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      const parsed = parseISO(dateStr);
      if (isNaN(parsed.getTime())) {
        const parts = dateStr.split(/[\s:-]/);
        if (parts.length >= 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
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
  const canBook = String(event.accept_booking) === '1';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-[calc(100vw-2rem)] max-w-sm md:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-y-auto md:overflow-hidden rounded-2xl border-0 shadow-2xl">
        <div className="grid md:grid-cols-2">

          {/* Left — Event Image (1:1 Square aspect ratio preserved) */}
          <div className="relative w-full aspect-square md:aspect-auto md:min-h-[360px] bg-slate-900 shrink-0">
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
              data-ai-hint="event concert festival"
            />
            {/* Dark gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Category badge */}
            {event.category && (
              <div className="absolute top-3 left-3">
                <span className="bg-white/90 text-slate-900 text-[10px] md:text-xs font-bold px-2.5 py-0.5 md:py-1 rounded-full uppercase tracking-wide">
                  {event.category}
                </span>
              </div>
            )}
          </div>

          {/* Right — Event Info */}
          <div className="relative flex flex-col bg-white dark:bg-slate-900 p-4 sm:p-6">
            {/* Urgency label */}
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <span className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] md:text-xs font-bold px-2.5 py-1 rounded-full">
                <Zap className="h-3 w-3 md:h-3.5 md:w-3.5 animate-pulse" />
                {canBook ? "Tickets Selling Fast!" : "Sold Out"}
              </span>
            </div>

            {/* Event name */}
            <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
              {event.name}
            </h2>

            {/* Details */}
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-5">
              <div className="flex items-center gap-2.5 text-xs md:text-sm">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 shrink-0">
                  <CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs md:text-sm">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 shrink-0">
                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 truncate">{event.venueName || event.location}</span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 hidden sm:block">
              Don&apos;t miss out on one of the hottest events of the year. Grab your tickets before they&apos;re all gone.
            </p>

            {/* CTA Button */}
            <div className="mt-auto space-y-1.5 pt-2">
              {canBook ? (
                <Link
                  href={`/events/${event.slug}/book`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent/90 text-white font-bold py-2.5 md:py-3.5 rounded-xl transition-colors text-xs md:text-sm"
                >
                  <Ticket className="h-4 w-4" />
                  Buy Tickets Now
                </Link>
              ) : (
                <button disabled className="flex items-center justify-center gap-2 w-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold py-2.5 md:py-3.5 rounded-xl text-xs md:text-sm cursor-not-allowed">
                  <Ban className="h-4 w-4" />
                  Sold Out
                </button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="w-full text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeaturedEventModal;
