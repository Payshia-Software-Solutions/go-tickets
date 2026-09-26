"use client";

import { useEffect } from 'react';
import type { Event } from '@/lib/types';
import * as fpixel from '@/lib/fpixel';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Building, Info, Ticket as TicketIcon, Clock, Briefcase, Ban, ExternalLink, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

const safeParseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch (e) {
    try {
      const parts = dateStr.split(/[\s:-]/);
      if (parts.length >= 3) {
        return new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
          parseInt(parts[3]) || 0,
          parseInt(parts[4]) || 0,
          parseInt(parts[5]) || 0
        );
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
  const venueMapLink =
    event.mapLink ||
    (venueAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(venueAddress)}`
      : undefined);
  const canBook = String(event.accept_booking) === '1';

  // Calculate lowest ticket price if available
  const allPrices = event.ticketTypes?.map((t) => t.price) || [];
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20">
      {/* Top Banner / Breadcrumb Header */}
      <div className="bg-slate-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <Link href="/search" className="hover:text-white transition-colors">Events</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium truncate">{event.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Column (8 cols on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            
            {/* Event Media & Core Info Card (Preserves 1:1 Square Artworks cleanly) */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                
                {/* Image Container - 1:1 Aspect ratio so poster is never cropped */}
                <div className="md:col-span-5 relative aspect-square bg-slate-900 shrink-0">
                  <Image
                    src={event.imageUrl || "https://placehold.co/600x600.png"}
                    alt={event.name}
                    fill
                    className="object-cover"
                    data-ai-hint="event stage"
                    priority
                  />
                  {!canBook && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 text-center">
                      <span className="bg-red-600 text-white font-extrabold px-4 py-2 rounded-full tracking-wider uppercase text-xs shadow-lg">
                        Bookings Closed
                      </span>
                    </div>
                  )}
                  {event.category && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-slate-900/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        {event.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Specs on Right Side of Card */}
                <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center space-y-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {event.name}
                    </h1>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-3.5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-primary shrink-0 mt-0.5">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date &amp; Time</p>
                        <p className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{formattedMainEventDate}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">(See specific showtimes below)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-accent shrink-0 mt-0.5">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</p>
                        <p className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{event.location}</p>
                        {venueName && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{venueName}</p>}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* About Event Description */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <Info className="h-5 w-5 text-accent" /> About This Event
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: event.description || "<p>No description available.</p>" }}
              />
            </div>

            {/* Showtimes & Tickets Breakdown */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 mb-2">
                <Clock className="h-5 w-5 text-accent" /> Showtimes &amp; Ticket Options
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Select your preferred showtime and ticket tier during the booking process.
              </p>

              {event.showTimes && event.showTimes.length > 0 ? (
                <div className="space-y-4">
                  {event.showTimes.map((showTime) => {
                    const showDateTimeObj = safeParseDate(showTime.dateTime);
                    const formattedShowDate = showDateTimeObj
                      ? format(showDateTimeObj, "EEEE, MMMM do, yyyy")
                      : "Date TBD";
                    const formattedShowTime = showDateTimeObj
                      ? format(showDateTimeObj, "p")
                      : "Time TBD";

                    return (
                      <div
                        key={showTime.id}
                        className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
                      >
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-white text-sm md:text-base flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-accent" />
                            {formattedShowDate}
                          </span>
                          <span className="text-xs md:text-sm font-semibold bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            {formattedShowTime}
                          </span>
                        </div>

                        {showTime.ticketAvailabilities && showTime.ticketAvailabilities.length > 0 ? (
                          <div className="space-y-2">
                            {showTime.ticketAvailabilities.map((availability) => (
                              <div
                                key={availability.ticketType.id}
                                className="flex justify-between items-center text-xs md:text-sm py-1.5"
                              >
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {availability.ticketType.name}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  LKR {availability.ticketType.price.toLocaleString('en-US')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            No specific ticket breakdown listed for this showtime.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center text-xs md:text-sm text-slate-500">
                  No specific showtimes listed. Check booking page or contact organizer.
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar Column (4 cols on desktop - STICKY) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
            
            {/* Booking Action Card */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md">
              {minPrice !== null && canBook && (
                <div className="mb-4">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Starting from</span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {minPrice === 0 ? 'Free' : `LKR ${minPrice.toLocaleString('en-US')}`}
                  </span>
                </div>
              )}

              {canBook ? (
                <Button asChild size="lg" className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-base shadow-sm">
                  <Link href={`/events/${event.slug}/book`}>
                    <TicketIcon className="mr-2 h-5 w-5" /> Book Tickets Now
                  </Link>
                </Button>
              ) : (
                <Button size="lg" disabled className="w-full h-12 bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-base cursor-not-allowed">
                  <Ban className="mr-2 h-5 w-5" /> Bookings Closed / Sold Out
                </Button>
              )}

              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3">
                Instant digital ticket confirmation &amp; QR validation
              </p>
            </div>

            {/* Venue Details Card */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Building className="h-4 w-4 text-accent" /> Venue Details
              </h3>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{venueName || "Venue TBD"}</p>
                {venueAddress && <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{venueAddress}</p>}
                {!venueAddress && !venueName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Detailed venue information not available.</p>
                )}
              </div>
              {venueMapLink && (
                <a
                  href={venueMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleFindLocationClick}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-1"
                >
                  <MapPin className="h-3.5 w-3.5 text-accent" /> View on Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Organizer Card */}
            {event.organizer ? (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-accent" /> Organizer
                </h3>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{event.organizer.name}</p>
                  {event.organizer.contactEmail && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.organizer.contactEmail}</p>
                  )}
                </div>
                {event.organizer.website && (
                  <a
                    href={event.organizer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-1"
                  >
                    Visit Organizer Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : event.organizerId ? (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-accent" /> Organizer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Organizer ID: {event.organizerId}</p>
              </div>
            ) : null}

          </div>

        </div>
      </div>

      {/* Sticky Mobile Bottom Bar for Quick Booking */}
      {canBook && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 z-40 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="container mx-auto px-4 flex items-center justify-between gap-4">
            <div>
              {minPrice !== null && (
                <>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block leading-none">Starting from</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {minPrice === 0 ? 'Free' : `LKR ${minPrice.toLocaleString('en-US')}`}
                  </span>
                </>
              )}
            </div>
            <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl px-5 h-10 text-sm shadow-sm shrink-0">
              <Link href={`/events/${event.slug}/book`}>
                <TicketIcon className="mr-1.5 h-4 w-4" /> Book Tickets
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
