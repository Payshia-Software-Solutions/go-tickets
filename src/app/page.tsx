
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUpcomingEvents, getEventCategories, mockEvents } from '@/lib/mockData';
import type { Event } from '@/lib/types';
import EventCard from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Ticket, Search, Zap, Users, Star, TrendingUp, MessageSquare,
  Cpu, Music2, Palette, Heart, Trophy, Drama, Rocket
} from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const categoryIcons: Record<string, React.ElementType> = {
  Technology: Cpu,
  Music: Music2,
  'Arts & Culture': Palette,
  Charity: Heart,
  Sports: Trophy,
  Theater: Drama,
  Future: Rocket,
  Default: Zap, // Fallback icon
};

export default function HomePage() {
  const router = useRouter();
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [popularEvents, setPopularEvents] = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setUpcomingEvents(await getUpcomingEvents(3));
      setCategories(await getEventCategories());
      setPopularEvents(mockEvents.slice(0, 3));
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (heroSearchQuery.trim().length > 1) {
      const filtered = mockEvents.filter(event =>
        event.name.toLowerCase().includes(heroSearchQuery.toLowerCase())
      ).slice(0, 5);
      setSuggestedEvents(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestedEvents([]);
      setShowSuggestions(false);
    }
  }, [heroSearchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const guestReviews = [
    {
      id: 'review1',
      name: 'Sarah L.',
      avatarUrl: 'https://placehold.co/100x100.png',
      avatarFallback: 'SL',
      rating: 5,
      review: 'Absolutely fantastic! The booking process was smooth, and the event was unforgettable. Highly recommend MyPass.lk!',
      event: 'Summer Music Fest 2024',
      dataAiHint: 'person portrait',
    },
    {
      id: 'review2',
      name: 'Michael B.',
      avatarUrl: 'https://placehold.co/100x100.png',
      avatarFallback: 'MB',
      rating: 4,
      review: 'Great selection of events and easy to find what I was looking for. The app is very user-friendly.',
      event: 'Tech Conference 2024',
      dataAiHint: 'person portrait',
    },
    {
      id: 'review3',
      name: 'Jessica P.',
      avatarUrl: 'https://placehold.co/100x100.png',
      avatarFallback: 'JP',
      rating: 5,
      review: 'Attended the Charity Gala booked through this site. Everything was perfect, from ticketing to the event itself. Will use again!',
      event: 'Charity Gala Night',
      dataAiHint: 'person portrait',
    },
  ];

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (heroSearchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(heroSearchQuery.trim())}`);
    }
  };

  return (
    <div className="pb-10">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-accent text-primary-foreground py-20 md:py-32">
        <div className="absolute inset-0">
            <Image
                src="https://placehold.co/1920x1080.png"
                alt="Hero Background"
                fill={true}
                style={{objectFit: 'cover'}}
                className="opacity-20"
                data-ai-hint="concert crowd"
            />
        </div>
        <div className="container mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline mb-6">
            Discover Your Next Event
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-10 max-w-3xl mx-auto">
            Find tickets for concerts, sports, theater, festivals, and more. Your unforgettable experience starts here.
          </p>
          <div ref={searchContainerRef} className="max-w-xl mx-auto mt-10 relative px-4 sm:px-0">
            <form onSubmit={handleHeroSearch} className="flex gap-2">
              <Input
                type="search"
                placeholder="Search events, artists, or venues..."
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
                onFocus={() => {
                  if (heroSearchQuery.trim().length > 1 && suggestedEvents.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="flex-grow h-12 text-base bg-background/90 text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-accent"
                aria-label="Search for events"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestedEvents.length > 0}
              />
              <Button type="submit" size="lg" className="h-12 !text-accent-foreground hover:!bg-accent/90 !bg-accent">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </form>
            {showSuggestions && suggestedEvents.length > 0 && (
              <Card className="absolute top-full mt-1 w-full max-h-60 overflow-y-auto z-20 shadow-lg text-left">
                <CardContent className="p-0">
                  <ul role="listbox">
                    {suggestedEvents.map(event => (
                      <li key={event.id} role="option">
                        <Link
                          href={`/events/${event.slug}`}
                          className="block p-3 hover:bg-muted transition-colors text-sm text-foreground"
                          onClick={() => {
                            setHeroSearchQuery(event.name);
                            setShowSuggestions(false);
                            router.push(`/events/${event.slug}`);
                          }}
                        >
                          {event.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="container mx-auto px-4 mt-12 md:mt-16 lg:mt-20">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline">Explore by Category</h2>
        <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-5 md:gap-6 md:space-x-0 md:pb-0 md:snap-none">
          {categories.map((category) => {
            const IconComponent = categoryIcons[category] || categoryIcons.Default;
            return (
              <div key={category} className="snap-center shrink-0 w-[40vw] sm:w-[28vw] md:w-full pb-1">
                <Link href={`/search?category=${encodeURIComponent(category)}`} legacyBehavior>
                  <a className="block h-full">
                    <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col justify-center items-center p-4 aspect-square">
                      <CardHeader className="p-2 flex flex-col items-center justify-center">
                        <IconComponent className="h-10 w-10 text-primary mb-2" />
                        <CardTitle className="text-base font-semibold leading-tight">{category}</CardTitle>
                      </CardHeader>
                    </Card>
                  </a>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular Events Section */}
      <section className="container mx-auto px-4 mt-12 md:mt-16 lg:mt-20">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline flex items-center justify-center">
          <TrendingUp className="mr-3 h-8 w-8 text-accent" /> Popular Events
        </h2>
        {popularEvents.length > 0 ? (
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 md:space-x-0 lg:grid-cols-3 md:gap-8 md:pb-0 md:snap-none">
            {popularEvents.map((event) => (
              <div key={event.id} className="snap-center shrink-0 w-[80vw] sm:w-[70vw] md:w-full">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No popular events to show at the moment.</p>
        )}
      </section>

      {/* Upcoming Events Section */}
      <section className="container mx-auto px-4 mt-12 md:mt-16 lg:mt-20">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
           <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 md:space-x-0 lg:grid-cols-3 md:gap-8 md:pb-0 md:snap-none">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="snap-center shrink-0 w-[80vw] sm:w-[70vw] md:w-full">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No upcoming events at the moment. Check back soon!</p>
        )}
        <div className="text-center mt-10">
          <Button asChild size="lg">
            <Link href="/search">Browse All Events</Link>
          </Button>
        </div>
      </section>

      {/* Guest Reviews Section */}
      <section className="bg-secondary/30 py-16 mt-12 md:mt-16 lg:mt-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline flex items-center justify-center">
            <MessageSquare className="mr-3 h-8 w-8 text-primary" /> What Our Guests Say
          </h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 md:space-x-0 lg:grid-cols-3 md:gap-8 md:pb-0 md:snap-none">
            {guestReviews.map((review) => (
              <div key={review.id} className="snap-center shrink-0 w-[80vw] sm:w-[70vw] md:w-full md:h-auto pb-1">
                <Card className="shadow-lg flex flex-col h-full">
                  <CardHeader className="flex-row gap-4 items-center">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={review.avatarUrl} alt={review.name} data-ai-hint={review.dataAiHint} />
                      <AvatarFallback>{review.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{review.name}</CardTitle>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground leading-relaxed">{review.review}</p>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">Reviewed event: {review.event}</p>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="bg-muted mt-12 md:mt-16 lg:mt-20">
        <div className="container mx-auto px-4 py-12"> {/* Added py-12 here to maintain some internal padding if desired */}
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">Why MyPass.lk?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
              <p className="text-muted-foreground">Access thousands of events, from local gatherings to global festivals.</p>
            </div>
            <div className="p-6">
              <Ticket className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
              <p className="text-muted-foreground">Secure your tickets in just a few clicks with our streamlined process.</p>
            </div>
            <div className="p-6">
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Trusted Platform</h3>
              <p className="text-muted-foreground">Book with confidence on a secure and reliable ticket marketplace.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
