
import { getEventBySlug } from '@/lib/mockData';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Users, Building, Tag, Info, Ticket as TicketIcon, Clock, Briefcase } from 'lucide-react';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface EventDetailsPageProps {
  params: { slug: string };
}

export async function generateMetadata(
  { params }: EventDetailsPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const event = await getEventBySlug(params.slug);

  if (!event) {
    return {
      title: 'Event Not Found',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: event.name,
    description: event.description.substring(0, 160), // Keep descriptions concise for meta tags
    openGraph: {
      title: event.name,
      description: event.description.substring(0, 100), // Shorter for OG
      images: [
        {
          url: event.imageUrl, // Assuming imageUrl is absolute or metadataBase is set
          width: 800, // Provide dimensions if known
          height: 450,
          alt: event.name,
        },
        ...previousImages,
      ],
      type: 'article', // Or 'event' if you have specific event schema
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: event.description.substring(0, 100),
      images: [event.imageUrl],
    },
  };
}

export async function generateStaticParams() {
  // In a real app, fetch all event slugs
  // For now, using mockData directly if it were easily accessible here or use a subset
  const mockEventSlugs = ['tech-conference-2024', 'summer-music-fest', 'art-exhibition-modern', 'charity-gala-night', 'sports-championship-final', 'local-theater-play'];
  return mockEventSlugs.map((slug) => ({
    slug,
  }));
}

export default async function EventDetailsPage({ params: { slug } }: EventDetailsPageProps) {
  const event = await getEventBySlug(slug);

  if (!event) {
    return <div className="container mx-auto py-12 text-center">Event not found.</div>;
  }

  const mainEventDate = new Date(event.date);
  const formattedMainEventDate = mainEventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  // const formattedMainEventTime = mainEventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Image and Core Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden shadow-lg">
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
              <div className="flex flex-wrap gap-2 mb-3">
                 <Badge variant="secondary">{event.category}</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-headline mb-4 text-primary">{event.name}</h1>
              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-center">
                  <CalendarDays className="mr-3 h-5 w-5 text-accent" />
                  <span>Main Event Date: {formattedMainEventDate} (See specific showtimes below)</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-3 h-5 w-5 text-accent" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Building className="mr-3 h-5 w-5 text-accent" />
                  <span>Venue: {event.venue.name} {event.venue.address && `(${event.venue.address})`}</span>
                </div>
                 {event.venue.mapLink && (
                  <a href={event.venue.mapLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block pl-8">
                    View on map
                  </a>
                )}
              </div>
            </CardContent>
             <CardFooter className="p-6 border-t">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/events/${event.slug}/book`}>
                  <TicketIcon className="mr-2 h-5 w-5" /> Book Tickets
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-primary" /> About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-line" 
                dangerouslySetInnerHTML={{ __html: event.description }} 
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Organizer and Showtimes */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{event.organizer.name}</p>
              <p className="text-sm text-muted-foreground">{event.organizer.contactEmail}</p>
              {event.organizer.website && (
                <a href={event.organizer.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block">
                  Visit Website
                </a>
              )}
            </CardContent>
          </Card>

          {/* Showtimes and Tickets Section - MOVED HERE */}
          {event.showTimes && event.showTimes.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6 text-primary" /> Showtimes &amp; Tickets</CardTitle>
                <CardDescription>Select tickets for your preferred showtime on the booking page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {event.showTimes.map((showTime, index) => {
                  const showDateTime = new Date(showTime.dateTime);
                  const formattedShowDate = showDateTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  const formattedShowTime = showDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={showTime.id} className="p-4 border rounded-md bg-muted/20">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-accent">
                          {formattedShowDate} at {formattedShowTime}
                        </h3>
                      </div>
                      {showTime.ticketAvailabilities && showTime.ticketAvailabilities.length > 0 ? (
                        <div className="space-y-2">
                          {showTime.ticketAvailabilities.map(availability => (
                            <div key={availability.ticketType.id} className="flex justify-between items-center text-sm p-2 border-b border-border/50 last:border-b-0">
                              <div>
                                <p className="font-medium text-foreground">{availability.ticketType.name}</p>
                                <p className="text-xs text-muted-foreground">LKR {availability.ticketType.price.toFixed(2)}</p>
                              </div>
                              <Badge variant={availability.availableCount > 0 ? "default" : "destructive"} className="font-mono">
                                {availability.availableCount > 0 ? `${availability.availableCount} available` : "Sold Out"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No specific ticket information for this showtime.</p>
                      )}
                      {index < event.showTimes.length - 1 && <Separator className="my-4" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
