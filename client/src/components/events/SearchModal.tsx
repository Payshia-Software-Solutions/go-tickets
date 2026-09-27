"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  MapPin,
  CalendarDays,
  Crown,
  Heart,
  Sparkles,
  ChevronRight,
  Loader2,
  Tag,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Event } from '@/lib/types';
import { fetchEventsFromApi } from '@/lib/services/event.service';
import { TICKET_TYPES_API_URL } from '@/lib/constants';

interface SearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchModal({ isOpen, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSelectedCategory('All');
    }
  }, [isOpen]);

  // Load wishlist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gotickets_wishlist');
      if (saved) {
        setWishlist(new Set(JSON.parse(saved)));
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const toggleWishlist = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      try {
        localStorage.setItem('gotickets_wishlist', JSON.stringify(Array.from(next)));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Fetch events & ticket types when modal is opened for the first time
  useEffect(() => {
    if (!isOpen || events.length > 0) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetchEventsFromApi().catch(() => []),
      fetch(TICKET_TYPES_API_URL)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([eventsData, ticketTypesData]) => {
        if (!isMounted) return;

        // Build price map per event
        const priceMap: Record<string, number> = {};
        if (Array.isArray(ticketTypesData)) {
          ticketTypesData.forEach((tt: any) => {
            const eId = String(tt.eventId || tt.event_id || '');
            const price = parseFloat(tt.price) || 0;
            if (eId) {
              if (priceMap[eId] === undefined || price < priceMap[eId]) {
                priceMap[eId] = price;
              }
            }
          });
        }

        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setTicketPrices(priceMap);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, events.length]);

  // Extract dynamic categories from events
  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category && e.category.trim()) {
        set.add(e.category.trim());
      }
    });
    const list = Array.from(set);
    // Sort and limit
    return ['Featured', 'All', ...list];
  }, [events]);

  // Filter events based on search query and selected category
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      // Category / Featured filter
      if (selectedCategory === 'Featured') {
        if (!event.is_featured) return false;
      } else if (selectedCategory !== 'All') {
        if (
          !event.category ||
          !event.category.toLowerCase().includes(selectedCategory.toLowerCase())
        ) {
          return false;
        }
      }

      // Search query filter
      if (!q) return true;

      const nameMatch = event.name?.toLowerCase().includes(q);
      const locationMatch = event.location?.toLowerCase().includes(q);
      const venueMatch = event.venueName?.toLowerCase().includes(q);
      const categoryMatch = event.category?.toLowerCase().includes(q);
      const descriptionMatch = event.description?.toLowerCase().includes(q);

      return nameMatch || locationMatch || venueMatch || categoryMatch || descriptionMatch;
    });
  }, [events, searchQuery, selectedCategory]);

  const handleSelectEvent = (event: Event) => {
    onOpenChange(false);
    router.push(`/events/${event.slug}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-[90vw] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <DialogTitle className="sr-only">Search Events</DialogTitle>

        {/* --- Top Search Input Bar --- */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/80 bg-background/80 backdrop-blur-md gap-3">
          <Search className="h-5 w-5 text-primary shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, artists, venues..."
            className="w-full bg-transparent text-base sm:text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-6"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* --- Category / Tag Filter Pills --- */}
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto border-b border-border/60 bg-muted/20 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105'
                    : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                }`}
              >
                {cat === 'Featured' && <Crown className="h-3 w-3 fill-amber-400 text-amber-500" />}
                {cat === 'All' ? 'All Events' : cat}
              </button>
            );
          })}
        </div>

        {/* --- Results Header & Counter --- */}
        <div className="flex items-center justify-between px-5 pt-3.5 pb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span>
            {isLoading
              ? 'Loading events...'
              : `Results (${filteredEvents.length})`}
          </span>
          {selectedCategory !== 'All' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className="text-[11px] font-semibold text-primary hover:underline lowercase capitalize"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* --- Results Content Area --- */}
        <div className="max-h-[62vh] overflow-y-auto p-4 pt-1 space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-border/60 bg-muted/20 animate-pulse flex justify-between gap-3 h-28"
                >
                  <div className="space-y-2 flex-grow">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded w-4/5" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="w-20 h-20 bg-muted rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            /* Empty State */
            <div className="py-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No events found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                We couldn&apos;t find any events matching{' '}
                <span className="font-semibold text-foreground">&quot;{searchQuery}&quot;</span>. Try another keyword or browse all events.
              </p>
              {(searchQuery || selectedCategory !== 'All') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="rounded-full text-xs font-semibold"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            /* 2-Column Event Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEvents.map((event) => {
                let eventDate: Date;
                try {
                  eventDate = typeof event.date === 'string' ? parseISO(event.date) : new Date(event.date);
                  if (isNaN(eventDate.getTime())) eventDate = new Date();
                } catch {
                  eventDate = new Date();
                }

                const dayStr = format(eventDate, 'dd');
                const monthStr = format(eventDate, 'MMM').toUpperCase();
                const timeStr = format(eventDate, 'hh:mm a');

                const minPrice =
                  event.ticketTypes && event.ticketTypes.length > 0
                    ? Math.min(...event.ticketTypes.map((t) => t.price))
                    : ticketPrices[event.id] !== undefined
                    ? ticketPrices[event.id]
                    : null;

                const isWishlisted = wishlist.has(event.id);
                const displayLocation = event.venueName || event.location || 'Sri Lanka';
                const canBook = String(event.accept_booking) === '1';

                return (
                  <div
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className="group relative flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm transition-all cursor-pointer gap-3 text-left"
                  >
                    {/* Left Column: Details */}
                    <div className="flex flex-col justify-between flex-grow min-w-0 pr-1 h-full py-0.5 space-y-1.5">
                      {/* Category & Status Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                          {event.category || 'Event'}
                        </span>
                        {event.is_featured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Crown className="h-2.5 w-2.5 fill-amber-500" /> Trending
                          </span>
                        ) : null}
                      </div>

                      {/* Event Title */}
                      <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {event.name}
                      </h4>

                      {/* Venue / Location */}
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-accent shrink-0" />
                        <span className="truncate">{displayLocation}</span>
                      </p>

                      {/* Date, Time & Pricing Row */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="text-[11px] font-extrabold text-foreground leading-tight">
                            <span>{dayStr}</span> <span className="text-primary">{monthStr}</span>
                          </div>
                          <span className="text-muted-foreground/60">·</span>
                          <div className="text-[11px] font-semibold text-muted-foreground">
                            {timeStr}
                          </div>
                        </div>

                        <div className="text-right">
                          {minPrice !== null ? (
                            <span className="text-xs font-bold text-foreground">
                              {minPrice === 0 ? 'Free' : `LKR ${minPrice.toLocaleString()}`}
                              <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                onwards
                              </span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-primary">
                              {canBook ? 'View Tickets' : 'Sold Out'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Poster Thumbnail */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shrink-0 border border-border/60 bg-muted shadow-xs">
                      <Image
                        src={event.imageUrl || 'https://placehold.co/400x400.png'}
                        alt={event.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 80px, 96px"
                      />

                      {/* Wishlist Heart Icon */}
                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(e, event.id)}
                        className={`absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 backdrop-blur-xs transition-transform hover:scale-110 ${
                          isWishlisted ? 'text-red-500' : 'text-white/80 hover:text-white'
                        }`}
                        title={isWishlisted ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-red-500' : ''}`}
                        />
                      </button>

                      {/* Sold out overlay */}
                      {!canBook && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1 text-center">
                          <span className="text-[9px] font-extrabold text-white uppercase bg-destructive/90 px-1.5 py-0.5 rounded">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- Modal Footer --- */}
        <div className="px-5 py-2.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Navigate using</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">
              ESC
            </kbd>
            <span className="hidden sm:inline">to close</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              router.push('/search');
            }}
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1 ml-auto text-xs"
          >
            Browse all events directory <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
