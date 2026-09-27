"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Event } from '@/lib/types';
import * as fpixel from '@/lib/fpixel';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  MapPin,
  Building,
  Info,
  Ticket as TicketIcon,
  Clock,
  Briefcase,
  Ban,
  ExternalLink,
  ChevronRight,
  Crown,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import QRCode from '@/components/QRCode';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const safeParseDate = (dateStr: string | undefined | Date): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  try {
    const d = parseISO(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    // continue to fallback
  }
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
    console.warn(`Could not parse date string: ${dateStr}`, parseError);
  }
  return null;
};

export default function EventDetailsClientView({ event }: { event: Event }) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

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

  // Determine target show date/time for countdown and calendar
  const targetDateTime = useMemo(() => {
    if (event.showTimes && event.showTimes.length > 0) {
      const parsedTimes = event.showTimes
        .map((st) => safeParseDate(typeof st.dateTime === 'string' ? st.dateTime : (st.dateTime as any)?.toISOString?.()))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      const now = Date.now();
      const upcoming = parsedTimes.find((d) => d.getTime() > now);
      if (upcoming) return upcoming;
      if (parsedTimes.length > 0) return parsedTimes[0];
    }
    return safeParseDate(event.date);
  }, [event.showTimes, event.date]);

  // Live countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    if (!targetDateTime) return;

    const calculate = () => {
      const diff = targetDateTime.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isPast: false,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDateTime]);

  // Formatted date and time values for the countdown badge row
  const formattedEventDay = targetDateTime ? format(targetDateTime, "dd") : "--";
  const formattedEventMonth = targetDateTime ? format(targetDateTime, "MMM") : "TBD";
  const formattedEventTime = targetDateTime ? format(targetDateTime, "hh:mm") : "--:--";
  const formattedEventAmPm = targetDateTime ? format(targetDateTime, "a") : "";

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

  // Calendar Helpers
  const getEventEndDateTime = (start: Date) => {
    return new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours duration
  };

  const handleAddToGoogleCalendar = () => {
    if (!targetDateTime) return;
    const end = getEventEndDateTime(targetDateTime);
    const formatG = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = event.name;
    const details = `Book tickets and view event details: ${currentUrl || `https://gotickets.lk/events/${event.slug}`}`;
    const location = venueAddress || venueName || event.location || "";
    const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatG(targetDateTime)}/${formatG(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    window.open(gUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddToAppleCalendar = () => {
    if (!targetDateTime) return;
    const end = getEventEndDateTime(targetDateTime);
    const formatICS = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const location = venueAddress || venueName || event.location || "";
    const url = currentUrl || `https://gotickets.lk/events/${event.slug}`;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GoTickets//Event Details//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id || Date.now()}@gotickets.lk`,
      `DTSTAMP:${formatICS(new Date())}`,
      `DTSTART:${formatICS(targetDateTime)}`,
      `DTEND:${formatICS(end)}`,
      `SUMMARY:${event.name}`,
      `DESCRIPTION:Event tickets & info: ${url}`,
      `LOCATION:${location}`,
      `URL:${url}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${event.slug || "event"}-gotickets.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    toast({
      title: "Calendar Event Downloaded",
      description: "Open the downloaded file to add to Apple Calendar / iCal.",
    });
  };

  const handleAddToOutlookCalendar = () => {
    if (!targetDateTime) return;
    const end = getEventEndDateTime(targetDateTime);
    const location = venueAddress || venueName || event.location || "";
    const url = currentUrl || `https://gotickets.lk/events/${event.slug}`;
    const outlookUrl = `https://outlook.live.com/calendar/0/action/compose?allday=false&subject=${encodeURIComponent(event.name)}&body=${encodeURIComponent(`Event tickets & info: ${url}`)}&location=${encodeURIComponent(location)}&startdt=${targetDateTime.toISOString()}&enddt=${end.toISOString()}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareEvent = async () => {
    const urlToShare = currentUrl || (typeof window !== 'undefined' ? window.location.href : `https://gotickets.lk/events/${event.slug}`);
    const shareData = {
      title: event.name,
      text: `Join me at ${event.name} on GoTickets!`,
      url: urlToShare,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(urlToShare);
      toast({
        title: "Link Copied!",
        description: "Event link copied to clipboard. Share it with your friends!",
      });
    } catch {
      toast({
        title: "Event URL",
        description: urlToShare,
      });
    }
  };

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
            
            {/* TicketsMinistry Style Hero Booking & Countdown Card */}
            <div className="bg-[#0b0d17] text-white border border-[#1b1f33] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              
              {/* Crown Icon / Featured Badge Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Crown className="w-5 h-5 fill-emerald-400/20" />
                </div>
                {event.is_featured ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Featured Event
                  </span>
                ) : null}
              </div>

              {/* Event will start on label */}
              <p className="text-xs font-medium text-slate-400 mb-3 tracking-wide">
                Event will start on
              </p>

              {/* Live Countdown Stat Boxes */}
              {timeLeft.isPast ? (
                <div className="bg-[#141829] border border-emerald-500/25 rounded-2xl py-3 px-4 text-center mb-5 flex items-center justify-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Event Started / Happening Now
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  <div className="bg-[#15192c] border border-white/5 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
                      {mounted ? timeLeft.days : "-"}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 mt-1.5">Days</span>
                  </div>

                  <div className="bg-[#15192c] border border-white/5 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
                      {mounted ? String(timeLeft.hours).padStart(2, '0') : "-"}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 mt-1.5">Hours</span>
                  </div>

                  <div className="bg-[#15192c] border border-white/5 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
                      {mounted ? String(timeLeft.minutes).padStart(2, '0') : "-"}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 mt-1.5">Mins</span>
                  </div>

                  <div className="bg-[#15192c] border border-white/5 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
                      {mounted ? String(timeLeft.seconds).padStart(2, '0') : "-"}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 mt-1.5">Secs</span>
                  </div>
                </div>
              )}

              {/* Date, Time & Category row */}
              <div className="flex items-center gap-2.5 py-1 mb-5 flex-wrap">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-orange-500 font-bold text-base">{formattedEventDay}</span>
                  <span className="text-white font-semibold">{formattedEventMonth}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-orange-500 font-bold text-base">{formattedEventTime}</span>
                  <span className="text-white font-semibold">{formattedEventAmPm}</span>
                </div>
                <span className="text-slate-600 font-light">|</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#22213d] text-indigo-300 border border-indigo-500/25">
                  {event.category || "Concerts"}
                </span>
              </div>

              {/* Price section */}
              <div className="mb-5">
                <span className="text-xs font-medium text-slate-400 block mb-1">Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {minPrice === null
                      ? "TBD"
                      : minPrice === 0
                      ? "Free"
                      : `LKR ${minPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  {minPrice !== null && minPrice > 0 && (
                    <span className="text-xs md:text-sm font-medium text-slate-400">Upwards</span>
                  )}
                </div>
              </div>

              {/* Primary Action Button (Get Tickets) */}
              {canBook ? (
                <Button
                  asChild
                  className="w-full h-12 py-3 rounded-2xl bg-[#ff5500] hover:bg-[#ff681a] text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center mb-4 cursor-pointer"
                >
                  <Link href={`/events/${event.slug}/book`}>
                    Get Tickets
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full h-12 py-3 rounded-2xl bg-slate-800 text-slate-500 font-bold text-base cursor-not-allowed mb-4"
                >
                  <Ban className="mr-2 h-5 w-5" /> Bookings Closed / Sold Out
                </Button>
              )}

              {/* WhatsApp Updates Card */}
              {(() => {
                const rawPhone = (event as any).organizerPhone || (event as any).phone || "94718750770";
                const cleanDigits = String(rawPhone).replace(/[^0-9]/g, '');
                const targetWhatsAppNumber = cleanDigits.startsWith('0')
                  ? '94' + cleanDigits.substring(1)
                  : cleanDigits.startsWith('94')
                  ? cleanDigits
                  : '94' + cleanDigits;
                const waMessage = `Hi GoTickets, I'd like to get updates for "${event.name}" (Gate times, line-up changes, extra releases). Event: ${currentUrl || `https://gotickets.lk/events/${event.slug}`}`;
                const waLink = `https://wa.me/${targetWhatsAppNumber}?text=${encodeURIComponent(waMessage)}`;

                return (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#15192c] hover:bg-[#1d223c] transition-all border border-white/5 rounded-2xl p-3 flex items-center gap-3 mb-6 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.972.531 1.77.817 2.796.817 3.18 0 5.767-2.587 5.767-5.768.001-3.18-2.585-5.766-5.767-5.766zm3.393 8.163c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.227-.565-1.834-.766-3.007-2.637-3.099-2.76-.092-.122-.743-.988-.743-1.884 0-.895.467-1.336.634-1.517.167-.181.365-.227.487-.227.122 0 .243.002.35.007.113.005.263-.043.411.314.152.366.518 1.266.564 1.358.046.092.077.2.015.323-.061.122-.092.198-.183.305-.091.106-.192.237-.274.318-.092.091-.188.19-.081.373.107.183.475.783 1.019 1.267.7.624 1.29.817 1.473.908.183.091.29.076.397-.046.107-.122.457-.533.58-.716.122-.183.244-.152.411-.091.168.061 1.066.503 1.249.594.183.092.305.137.35.214.046.076.046.442-.098.847zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.434 5.178L2 22l4.981-1.396A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs md:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Get updates for this event
                      </div>
                      <div className="text-[11px] text-slate-400 leading-tight">
                        Gate times, line-up changes and extra releases, on WhatsApp.
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
                  </a>
                );
              })()}

              {/* Utility Row: Open on Phone QR Code + Add to Calendar & Share Event */}
              <div className="flex items-center justify-between pt-1">
                {/* QR Code */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                    OPEN ON PHONE
                  </span>
                  <div className="p-1.5 bg-white rounded-xl shadow-md inline-block w-[88px] h-[88px]">
                    <QRCode
                      data={currentUrl || `https://gotickets.lk/events/${event.slug}`}
                      size={76}
                      className="w-[76px] h-[76px]"
                    />
                  </div>
                </div>

                {/* Calendar & Share Actions */}
                <div className="flex flex-col justify-center space-y-3 pl-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer group py-1"
                      >
                        <CalendarDays className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        <span>Add to Calendar</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#15192c] border border-white/10 text-white rounded-xl p-1.5 min-w-[170px] shadow-2xl">
                      <DropdownMenuItem
                        onClick={handleAddToGoogleCalendar}
                        className="text-xs cursor-pointer hover:bg-white/10 rounded-lg px-3 py-2 text-slate-200 hover:text-white flex items-center gap-2"
                      >
                        Google Calendar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleAddToAppleCalendar}
                        className="text-xs cursor-pointer hover:bg-white/10 rounded-lg px-3 py-2 text-slate-200 hover:text-white flex items-center gap-2"
                      >
                        Apple Calendar (.ics)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleAddToOutlookCalendar}
                        className="text-xs cursor-pointer hover:bg-white/10 rounded-lg px-3 py-2 text-slate-200 hover:text-white flex items-center gap-2"
                      >
                        Outlook Calendar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    type="button"
                    onClick={handleShareEvent}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer group py-1"
                  >
                    <Share2 className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                    <span>Share Event</span>
                  </button>
                </div>
              </div>

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
