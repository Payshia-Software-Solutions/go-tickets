import { getUpcomingEvents, getEventCategories } from '@/lib/mockData';
import EventCard from '@/components/events/EventCard';
import EventFilters from '@/components/events/EventFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Ticket, Search, Zap, Users, Star } from 'lucide-react';
import Image from 'next/image';

export default async function HomePage() {
  const upcomingEvents = await getUpcomingEvents(6);
  const categories = await getEventCategories();

  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20">
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

      {/* Featured Events Section */}
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
