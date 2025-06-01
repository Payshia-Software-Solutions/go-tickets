
import { getUpcomingEvents, getEventCategories, mockEvents } from '@/lib/mockData';
import EventCard from '@/components/events/EventCard';
import EventFilters from '@/components/events/EventFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { Ticket, Search, Zap, Users, Star, TrendingUp, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function HomePage() {
  const upcomingEvents = await getUpcomingEvents(3); // Keep upcoming to 3 for balance
  const categories = await getEventCategories();
  const popularEvents = mockEvents.slice(0, 3); // Take first 3 as "popular"

  const guestReviews = [
    {
      id: 'review1',
      name: 'Sarah L.',
      avatarUrl: 'https://placehold.co/100x100.png',
      avatarFallback: 'SL',
      rating: 5,
      review: 'Absolutely fantastic! The booking process was smooth, and the event was unforgettable. Highly recommend Event Horizon!',
      event: 'Summer Music Fest 2024',
    },
    {
      id: 'review2',
      name: 'Michael B.',
      avatarUrl: 'https://placehold.co/100x100.png',
      avatarFallback: 'MB',
      rating: 4,
      review: 'Great selection of events and easy to find what I was looking for. The app is very user-friendly.',
      event: 'Tech Conference 2024',
    },
    {
      id: 'review3',
      name: 'Jessica P.',
      avatarUrl: 'https://placehold.co/100x100.png',
      avatarFallback: 'JP',
      rating: 5,
      review: 'Attended the Charity Gala booked through this site. Everything was perfect, from ticketing to the event itself. Will use again!',
      event: 'Charity Gala Night',
    },
  ];

  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20 pb-10">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-accent text-primary-foreground py-20 md:py-32">
        <div className="absolute inset-0">
            <Image 
                src="https://placehold.co/1920x1080.png" 
                alt="Hero Background" 
                layout="fill" 
                objectFit="cover" 
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
          <div className="max-w-4xl mx-auto">
            <EventFilters />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline">Explore by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link href={`/search?category=${encodeURIComponent(category)}`} key={category}>
              <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col justify-center items-center p-4 aspect-square">
                <CardHeader className="p-2">
                  {/* Placeholder for category icons - could use a mapping */}
                  <Zap className="h-10 w-10 text-primary mx-auto mb-2" /> 
                  <CardTitle className="text-lg font-semibold">{category}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Events Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline flex items-center justify-center">
          <TrendingUp className="mr-3 h-8 w-8 text-accent" /> Popular Events
        </h2>
        {popularEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {popularEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No popular events to show at the moment.</p>
        )}
      </section>
      
      {/* Upcoming Events Section */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10 font-headline">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
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
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline flex items-center justify-center">
            <MessageSquare className="mr-3 h-8 w-8 text-primary" /> What Our Guests Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {guestReviews.map((review) => (
              <Card key={review.id} className="shadow-lg flex flex-col">
                <CardHeader className="flex-row gap-4 items-center">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={review.avatarUrl} alt={review.name} data-ai-hint="person portrait" />
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
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">Why Event Horizon?</h2>
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
