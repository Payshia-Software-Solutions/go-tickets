"use client";

import { getEventBySlug } from '@/lib/mockData';
import TicketSelector from '@/components/events/TicketSelector';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarClock, Loader2, AlertTriangle, Ban, CalendarDays, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Event } from '@/lib/types';
import { useEffect, useState, use } from 'react';
import { format, parseISO } from 'date-fns';

interface BookEventPageProps {
  params: Promise<{ slug: string }>;
}

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

export default function BookEventPage({ params }: BookEventPageProps) {
  const { slug } = use(params);

  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [selectedShowTimeId, setSelectedShowTimeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      setIsLoading(true);
      try {
        const eventData = await getEventBySlug(slug);
        setEvent(eventData);
        if (eventData && eventData.showTimes && eventData.showTimes.length === 1) {
          setSelectedShowTimeId(eventData.showTimes[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
        setEvent(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (slug) {
      fetchEventData();
    }
  }, [slug]);

  useEffect(() => {
    if (event && typeof window !== 'undefined') {
      document.title = `Book Tickets for ${event.name} | GoTickets.lk`;
    } else if (event === null && typeof window !== 'undefined') {
      document.title = 'Event Not Found | GoTickets.lk';
    }
  }, [event]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center py-20 bg-slate-50/50 dark:bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-base font-medium text-slate-500">Loading event booking options...</p>
      </div>
    );
  }

  if (event === null || event === undefined) {
    return (
      <div className="min-h-[60vh] container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Event Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">The event you are looking for does not exist or has been removed.</p>
        <Button asChild className="bg-primary text-white rounded-xl px-6"><Link href="/search">Browse Other Events</Link></Button>
      </div>
    );
  }
  
  if (event.accept_booking === '0') {
    return (
      <div className="min-h-[60vh] container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mb-4">
          <Ban className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bookings Closed</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">We are currently no longer accepting ticket bookings for this event.</p>
        <Button asChild variant="outline" className="rounded-xl px-6"><Link href={`/events/${slug}`}>Back to Event Details</Link></Button>
      </div>
    );
  }

  if (!event || !event.showTimes || event.showTimes.length === 0) {
    return (
      <div className="min-h-[60vh] container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
          <CalendarClock className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Showtimes Available</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">There are currently no showtimes scheduled for this event.</p>
        <Button asChild variant="outline" className="rounded-xl px-6"><Link href={`/events/${slug}`}>Back to Event Details</Link></Button>
      </div>
    );
  }

  const selectedShowTimeObject = event.showTimes.find(st => st.id === selectedShowTimeId);
  
  const mainEventDateObj = safeParseDate(event.date);
  const formattedMainDate = mainEventDateObj 
    ? format(mainEventDateObj, "EEEE, MMMM do, yyyy") 
    : "Date TBD";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <Link href={`/events/${event.slug}`} className="hover:text-white transition-colors">Event Details</Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium">Select Tickets</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Column */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* Event Name & Quick Info Header Card (Prominently visible on Mobile) */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm flex items-center gap-4">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                <Image
                  src={event.imageUrl || "https://placehold.co/200x200.png"}
                  alt={event.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="bg-slate-100 dark:bg-slate-800 text-accent text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {event.category}
                </span>
                <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight truncate mt-1">
                  {event.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {formattedMainDate} &bull; {event.venueName || event.location}
                </p>
              </div>
            </div>
            
            {/* Multiple Showtimes Selection (If applicable) */}
            {event.showTimes.length > 1 && (
              <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-accent" /> Select Showtime
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  This event has multiple showtimes. Please pick your preferred date &amp; time.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {event.showTimes.map((st) => {
                    const showDateTimeObj = safeParseDate(st.dateTime);
                    const formattedShowDate = showDateTimeObj ? format(showDateTimeObj, "EEEE, MMMM do, yyyy") : "Invalid Date";
                    const formattedShowTime = showDateTimeObj ? format(showDateTimeObj, "p") : "Invalid Time";
                    const isSelected = selectedShowTimeId === st.id;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedShowTimeId(st.id)}
                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-200 ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-900/20 border-primary shadow-sm'
                            : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{formattedShowDate}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formattedShowTime}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ticket Selector Component */}
            {selectedShowTimeObject && (
              <TicketSelector event={event} selectedShowTime={selectedShowTimeObject} />
            )}
            
            {/* Proceed to Checkout Button */}
            {selectedShowTimeObject && (
              <div className="flex justify-end pt-4">
                <Button asChild size="lg" className="w-full sm:w-auto h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl px-8 text-base shadow-md">
                  <Link href="/checkout">
                    Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Right Summary Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Event Poster Thumbnail */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 shadow-sm">
                <Image 
                  src={event.imageUrl || "https://placehold.co/400x400.png"} 
                  alt={event.name} 
                  fill
                  className="object-cover"
                  data-ai-hint="event poster"
                />
              </div>

              <div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {event.category}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 leading-tight">
                  {event.name}
                </h2>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-start gap-2.5">
                  <CalendarDays className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{formattedMainDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{event.venueName || event.location}</p>
                    <p className="text-slate-500">{event.location}</p>
                  </div>
                </div>
              </div>

              {selectedShowTimeObject && (
                <div className="p-4 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Selected Showtime
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {safeParseDate(selectedShowTimeObject.dateTime)
                      ? format(safeParseDate(selectedShowTimeObject.dateTime)!, "EEEE, MMMM do, yyyy 'at' p")
                      : "Invalid date"}
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
