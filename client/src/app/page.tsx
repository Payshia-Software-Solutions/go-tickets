
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUpcomingEvents, getEventCategories, getPopularEvents, getEventSuggestionsByName, getFeaturedEvent } from '@/lib/mockData';
import type { Event, Category } from '@/lib/types';
import EventCard from '@/components/events/EventCard';
import {
  Ticket, Search, Zap, Users, Star, TrendingUp,
  Cpu, Music2, Palette, Heart, Drama, Rocket, Goal, PartyPopper, Smile, Images, Loader2
} from 'lucide-react';
import Image from 'next/image';
import FeaturedEventModal from '@/components/events/FeaturedEventModal';


const categoryDisplayData: Record<string, { icon: React.ElementType; bgColor: string; iconColor: string }> = {
  Music: { icon: Music2, bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  Sports: { icon: Goal, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  Theater: { icon: Drama, bgColor: 'bg-teal-100', iconColor: 'text-teal-600' },
  Festivals: { icon: PartyPopper, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  Comedy: { icon: Smile, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  Exhibitions: { icon: Images, bgColor: 'bg-cyan-100', iconColor: 'text-cyan-600' },
  Technology: { icon: Cpu, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' },
  'Arts & Culture': { icon: Palette, bgColor: 'bg-pink-100', iconColor: 'text-pink-600' },
  Charity: { icon: Heart, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
  Future: { icon: Rocket, bgColor: 'bg-lime-100', iconColor: 'text-lime-600' },
  Default: { icon: Zap, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
};

const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};


export default function HomePage() {
  const router = useRouter();
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularEvents, setPopularEvents] = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);

  // Featured event modal
  const [isFeaturedModalOpen, setIsFeaturedModalOpen] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);

  useEffect(() => {
    document.title = 'GoTickets.lk - Discover & Book Event Tickets';
    const fetchData = async () => {
      setIsLoadingPopular(true);
      getPopularEvents(4).then(data => { setPopularEvents(data); setIsLoadingPopular(false); });
      setIsLoadingUpcoming(true);
      getUpcomingEvents(8).then(data => { setUpcomingEvents(data); setIsLoadingUpcoming(false); });
      setIsLoadingCategories(true);
      getEventCategories().then(data => { setCategories(data); setIsLoadingCategories(false); });
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchFeaturedEvent = async () => {
      const viewCountString = localStorage.getItem('featuredEventViewCount') || '0';
      const viewCount = parseInt(viewCountString, 10);
      if (viewCount >= 100) return;
      try {
        const event = await getFeaturedEvent();
        if (event) {
          const eventDate = new Date(event.date);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (eventDate >= now) {
            setFeaturedEvent(event);
            const timer = setTimeout(() => {
              setIsFeaturedModalOpen(true);
              localStorage.setItem('featuredEventViewCount', String(viewCount + 1));
            }, 1500);
            return () => clearTimeout(timer);
          }
        }
      } catch (error) {
        console.error("Could not fetch featured event:", error);
      }
    };
    fetchFeaturedEvent();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (heroSearchQuery.trim().length > 0) {
        const suggestions = await getEventSuggestionsByName(heroSearchQuery.trim());
        setSuggestedEvents(suggestions.slice(0, 5));
        setShowSuggestions(suggestions.length > 0);
      } else {
        setSuggestedEvents([]);
        setShowSuggestions(false);
      }
    };
    const debounceTimer = setTimeout(() => { fetchSuggestions(); }, 300);
    return () => clearTimeout(debounceTimer);
  }, [heroSearchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [searchContainerRef]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (heroSearchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(heroSearchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen">
      <FeaturedEventModal
        isOpen={isFeaturedModalOpen}
        onOpenChange={setIsFeaturedModalOpen}
        event={featuredEvent}
      />

      {/* ── Hero Section ── */}
      <section className="bg-slate-900 text-white py-10 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <p className="text-accent text-xs sm:text-sm font-bold uppercase tracking-widest mb-3">
            Sri Lanka&apos;s Event Platform
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-3 text-white">
            Discover Unforgettable<br className="hidden md:block" />{' '}
            <span className="text-accent">Events Near You</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-base md:text-xl max-w-xl mx-auto mb-6 leading-relaxed">
            Find and book tickets for concerts, sports, theater, festivals, and more. All in one place.
          </p>

          {/* Search */}
          <div ref={searchContainerRef} className="max-w-xl mx-auto relative">
            <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search events, artists, venues..."
                  value={heroSearchQuery}
                  onChange={(e) => setHeroSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (heroSearchQuery.trim().length > 0 && suggestedEvents.length > 0) setShowSuggestions(true);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-sm sm:text-base"
                  aria-label="Search for events"
                />
              </div>
              <button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm sm:text-base whitespace-nowrap shadow-sm"
              >
                Search Events
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestedEvents.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden text-left">
                <ul>
                  {suggestedEvents.map(event => (
                    <li key={event.id}>
                      <Link
                        href={`/events/${event.slug}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors"
                        onClick={() => { setHeroSearchQuery(event.name); setShowSuggestions(false); }}
                      >
                        <Image
                          src={event.imageUrl || 'https://placehold.co/40x40.png'}
                          alt={event.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{event.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{event.category} · {event.location}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-10 text-slate-400 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-accent" /> 500+ Events</span>
            <span className="hidden sm:block w-px h-4 bg-slate-700" />
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-accent" /> 50k+ Tickets Sold</span>
            <span className="hidden sm:block w-px h-4 bg-slate-700" />
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-accent" /> Trusted Platform</span>
          </div>
        </div>
      </section>

      {/* ── Popular Events ── */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-accent text-xs font-bold uppercase tracking-widest mb-1">Trending</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> Popular Events
            </h2>
          </div>
          <Link href="/search" className="text-primary text-sm font-semibold hover:underline hidden sm:block">
            View all →
          </Link>
        </div>
        {isLoadingPopular ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : popularEvents.length > 0 ? (
          <>
            {/* Mobile: horizontal scroll slider */}
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory md:hidden">
              {popularEvents.map((event, idx) => (
                <div key={event.id} className="snap-start shrink-0 w-[72vw] sm:w-[48vw]">
                  <EventCard event={event} index={idx} />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {popularEvents.map((event, idx) => (
                <EventCard key={event.id} event={event} index={idx} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-10">No popular events at the moment.</p>
        )}
      </section>

      {/* ── Categories ── */}
      <section className="bg-secondary border-y border-border py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-accent text-xs font-bold uppercase tracking-widest mb-1">Browse</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Explore by Category</h2>
          </div>
          {isLoadingCategories ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4 md:pb-0">
              {categories.map((category, idx) => {
                const categoryKey = capitalizeWords(category.name);
                const displayInfo = categoryDisplayData[categoryKey] || categoryDisplayData.Default;
                const IconComponent = displayInfo.icon;
                return (
                  <div
                    key={String(category.id)}
                    className="shrink-0 w-[40vw] sm:w-[30vw] md:w-full animate-card-enter"
                    style={{ animationDelay: `${(idx % 12) * 0.1}s` }}
                  >
                    <Link href={`/search?category=${encodeURIComponent(category.name)}`} className="block h-full">
                      <div className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-card border border-border hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer text-center group">
                        <div className={`p-3 rounded-xl ${displayInfo.bgColor} group-hover:scale-105 transition-transform duration-200`}>
                          <IconComponent className={`h-6 w-6 ${displayInfo.iconColor}`} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{category.name}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No categories available.</p>
          )}
        </div>
      </section>

      {/* ── Upcoming Events ── */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-accent text-xs font-bold uppercase tracking-widest mb-1">Don&apos;t Miss Out</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Upcoming Events</h2>
          </div>
          <Link href="/search" className="text-primary text-sm font-semibold hover:underline hidden sm:block">
            View all →
          </Link>
        </div>
        {isLoadingUpcoming ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <>
            {/* Mobile: horizontal scroll slider */}
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory md:hidden">
              {upcomingEvents.map((event, idx) => (
                <div key={event.id} className="snap-start shrink-0 w-[72vw] sm:w-[48vw]">
                  <EventCard event={event} index={idx} />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {upcomingEvents.map((event, idx) => (
                <EventCard key={event.id} event={event} index={idx} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-10">No upcoming events at the moment.</p>
        )}
        <div className="text-center mt-10">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Browse All Events
          </Link>
        </div>
      </section>

      {/* ── Why GoTickets ── */}
      <section className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold">Why Choose GoTickets.lk?</h2>
            <p className="text-slate-400 mt-2 text-sm">The easiest way to book event tickets in Sri Lanka</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="bg-accent/15 p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-bold mb-2">Wide Selection</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Access hundreds of events across Sri Lanka, from local gatherings to major festivals.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="bg-primary/20 p-4 rounded-full mb-4">
                <Ticket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Easy Booking</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Secure your tickets in just a few clicks. Instant confirmation, no hassle.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="bg-green-500/15 p-4 rounded-full mb-4">
                <Star className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Trusted Platform</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Book with confidence on a secure and verified ticket marketplace used by thousands.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
