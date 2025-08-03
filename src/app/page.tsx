
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUpcomingEvents, getEventCategories, getPopularEvents, getEventSuggestionsByName, getAdminEventById } from '@/lib/mockData'; 
import type { Event, Category } from '@/lib/types'; // Added Category
import EventCard from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Ticket, Search, Zap, Users, Star, TrendingUp, MessageSquare,
  Cpu, Music2, Palette, Heart, Drama, Rocket, Goal, PartyPopper, Smile, Images, Loader2
} from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

// Helper function to capitalize each word in a string
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};


export default function HomePage() {
  const router = useRouter();
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Changed to Category[]
  const [popularEvents, setPopularEvents] = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  
  // State for featured event modal
  const [isFeaturedModalOpen, setIsFeaturedModalOpen] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);


  useEffect(() => {
    document.title = 'GoTickets.lk - Discover & Book Event Tickets';

    const fetchData = async () => {
      setIsLoadingPopular(true);
      getPopularEvents(4).then(data => { 
        setPopularEvents(data);
        setIsLoadingPopular(false);
      });

      setIsLoadingUpcoming(true);
      getUpcomingEvents(8).then(data => { 
        setUpcomingEvents(data);
        setIsLoadingUpcoming(false);
      });

      setIsLoadingCategories(true);
      getEventCategories().then(data => { // Now returns Category[]
        setCategories(data);
        setIsLoadingCategories(false);
      });
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchFeaturedEvent = async () => {
      const viewCountString = localStorage.getItem('featuredEventViewCount') || '0';
      const viewCount = parseInt(viewCountString, 10);

      if (viewCount >= 100) {
        return;
      }

      try {
        const event = await getAdminEventById('1');
        if (event) {
          const eventDate = new Date(event.date);
          const now = new Date();
          // Set hours, minutes, seconds, and milliseconds to 0 for today to compare dates only
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
        setSuggestedEvents(suggestions.slice(0,5));
        setShowSuggestions(suggestions.length > 0);
      } else {
        setSuggestedEvents([]);
        setShowSuggestions(false);
      }
    };
    
    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceTimer);

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
      review: 'Absolutely fantastic! The booking process was smooth, and the event was unforgettable. Highly recommend GoTickets.lk!',
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

  const renderEventSection = (title: string, events: Event[], isLoading: boolean, icon?: React.ReactNode) => (
    <section className="container mx-auto px-4 mt-12 md:mt-16 lg:mt-20 ">
      <h2 className="text-3xl font-bold text-center mb-10 font-headline flex items-center justify-center">
        {icon} {title}
      </h2>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length > 0 ? (
        <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:pb-0 md:snap-none">
          {events.map((event) => (
            <div key={event.id} className="snap-center shrink-0 w-[80vw] sm:w-[70vw] md:w-full mb-10">
              <EventCard event={event} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No {title.toLowerCase()} to show at the moment.</p>
      )}
    </section>
  );


  return (
    <div className="">
      <FeaturedEventModal
        isOpen={isFeaturedModalOpen}
        onOpenChange={setIsFeaturedModalOpen}
        event={featuredEvent}
      />
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-20 md:py-32">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline mb-6">
            Discover Your Next Event
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-10 max-w-3xl mx-auto">
            Find tickets for concerts, sports, theater, festivals, and more. Your unforgettable experience starts here.
          </p>
          <div ref={searchContainerRef} className="max-w-xl mx-auto mt-10 relative px-4 sm:px-0">
            <form onSubmit={handleHeroSearch} className="flex flex-col md:flex-row gap-2">
              <Input
                type="search"
                placeholder="Search events, artists, or venues..."
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
                onFocus={() => {
                  if (heroSearchQuery.trim().length > 0 && suggestedEvents.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="flex-grow w-full h-12 text-base bg-background/90 text-foreground placeholder:text-muted-foreground/80 focus-visible:ring-accent"
                aria-label="Search for events"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestedEvents.length > 0}
              />
              <Button type="submit" size="lg" className="w-full md:w-auto h-12 !text-accent-foreground hover:!bg-accent/90 !bg-accent">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </form>
            {showSuggestions && suggestedEvents.length > 0 && (
              <Card className="absolute top-full mt-1 w-full max-h-80 overflow-y-auto z-20 shadow-lg text-left">
                <CardContent className="p-1">
                  <ul role="listbox">
                    {suggestedEvents.map(event => (
                      <li key={event.id} role="option" aria-selected="false">
                        <Link
                          href={`/events/${event.slug}`}
                          className="flex items-center p-2 hover:bg-muted transition-colors rounded-md"
                          onClick={() => {
                            setHeroSearchQuery(event.name);
                            setShowSuggestions(false);
                          }}
                        >
                          <Image
                            src={event.imageUrl || 'https://placehold.co/40x40.png'}
                            alt={event.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-md object-cover mr-3"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                            <p className="text-xs text-muted-foreground">{event.category} &bull; {event.location}</p>
                          </div>
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

      {/* Popular Events Section */}
      {renderEventSection("Popular Events", popularEvents, isLoadingPopular)}
      
      {/* Categories Section */}
      <section id="categories" className="container mx-auto px-4 mt-12 md:mt-16 lg:mt-20">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline">Explore by Category</h2>
        {isLoadingCategories ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="ml-3 text-muted-foreground">Loading categories...</p>
          </div>
        ) : categories.length > 0 ? (
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-6 md:space-x-0 md:pb-0 md:snap-none">
            {categories.map((category) => {
              const categoryKey = capitalizeWords(category.name);
              const displayInfo = categoryDisplayData[categoryKey] || categoryDisplayData.Default;
              const IconComponent = displayInfo.icon;
              return (
                <div key={String(category.id)} className="snap-center shrink-0 w-[40vw] sm:w-[30vw] md:w-full pb-1">
                  <Link href={`/search?category=${encodeURIComponent(category.name)}`} className="block h-full">
                    <Card className="text-center hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full flex flex-col justify-center items-center p-4 rounded-xl overflow-hidden">
                      <div className={`p-4 rounded-full mb-3 ${displayInfo.bgColor}`}>
                        <IconComponent className={`h-8 w-8 ${displayInfo.iconColor}`} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No categories available.</p>
        )}
      </section>

      {/* Upcoming Events Section */}
      <section className="container mx-auto px-4 mt-12 md:mt-16 lg:mt-20 mb-10">
        {renderEventSection("Upcoming Events", upcomingEvents, isLoadingUpcoming)}
      </section>

      <div className="text-center my-10">
        <Button asChild size="lg">
          <Link href="/search">Browse All Events</Link>
        </Button>
      </div>

      {/*
      <section className="bg-secondary/30 py-16 mt-12 md:mt-16 lg:mt-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline flex items-center justify-center">
            <MessageSquare className="mr-3 h-8 w-8 text-primary" /> What Our Guests Say
          </h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:pb-0 md:snap-none">
            {guestReviews.map((review) => (
              <div key={review.id} className="snap-center shrink-0 w-[80vw] sm:w-[70vw] md:w-full md:h-auto pb-1">
                <Card className="shadow-lg flex flex-col h-full rounded-xl overflow-hidden">
                  <CardContent className="p-6 flex-grow">
                    <div className="flex items-center mb-4">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarImage src={review.avatarUrl} alt={review.name} data-ai-hint={review.dataAiHint} />
                        <AvatarFallback>{review.avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{review.name}</h3>
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
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{review.review}</p>

                  </CardContent>
                  <div className="p-6 pt-0">
                    <p className="text-xs text-muted-foreground">Reviewed event: {review.event}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Why Choose Us Section */}
      <section className="bg-muted">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">Why GoTickets.lk?</h2>
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
