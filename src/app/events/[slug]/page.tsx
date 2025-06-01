
import { getEventBySlug } from '@/lib/mockData';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Users, Building, Tag, Info, Ticket as TicketIcon } from 'lucide-react';
import Link from 'next/link';
import TicketSelector from '@/components/events/TicketSelector'; // We might move this to book page. For now, display info here.

export async function generateStaticParams() {
  // In a real app, fetch all event slugs
  // For now, using mockData directly if it were easily accessible here or use a subset
  const mockEventSlugs = ['tech-conference-2024', 'summer-music-fest', 'art-exhibition-modern', 'charity-gala-night', 'sports-championship-final', 'local-theater-play'];
  return mockEventSlugs.map((slug) => ({
    slug,
  }));
}

export default async function EventDetailsPage({ params: { slug } }: { params: { slug: string } }) {
  const event = await getEventBySlug(slug);

  if (!event) {
    return <div className="container mx-auto py-12 text-center">Event not found.</div>;
  }

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image and Core Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="p-0">
              <Image
                src={event.imageUrl}
                alt={event.name}
                width={800}
                height={450}
                className="w-full h-auto object-cover aspect-[16/9]"
                data-ai-hint="event stage"
                priority
              />
            </CardHeader>
            <CardContent className="p-6">
              <h1 className="text-3xl md:text-4xl font-bold font-headline mb-4 text-primary">{event.name}</h1>
              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-center">
                  <CalendarDays className="mr-3 h-5 w-5 text-accent" />
                  <span>{formattedDate} at {formattedTime}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-3 h-5 w-5 text-accent" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Tag className="mr-3 h-5 w-5 text-accent" />
                  <span>Category: {event.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-primary" /> About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Booking Actions and Details */}
        <div className="space-y-6">
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center"><TicketIcon className="mr-2 h-6 w-6 text-primary" /> Get Your Tickets</CardTitle>
              <CardDescription>Secure your spot for {event.name}!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.ticketTypes.map(ticket => (
                <div key={ticket.id} className="p-3 border rounded-md bg-background">
                  <h4 className="font-semibold">{ticket.name}</h4>
                  <p className="text-lg font-bold text-primary">${ticket.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{ticket.availability} available</p>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button asChild size="lg" className="w-full">
                <Link href={`/events/${event.slug}/book`}>Book Tickets</Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{event.organizer.name}</p>
              {event.organizer.contact && <p className="text-sm text-muted-foreground">{event.organizer.contact}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-primary" /> Venue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{event.venue.name}</p>
              {event.venue.address && <p className="text-sm text-muted-foreground">{event.venue.address}</p>}
              {event.venue.mapLink && (
                <a href={event.venue.mapLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block">
                  View on map
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
