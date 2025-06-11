
import { getEventBySlug } from '@/lib/mockData'; // Updated to use API fetching
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Building, Info, Ticket as TicketIcon, Clock, Briefcase, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns'; // Import parseISO

interface EventDetailsPageProps {
  params: { slug: string };
}

// Helper to safely parse date strings
const safeParseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch (e) {
    // Fallback for "YYYY-MM-DD HH:MM:SS" if API sends this for main date too
    try {
      const parts = dateStr.split(/[\s:-]/);
      if (parts.length >= 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), 
                        parseInt(parts[3]) || 0, parseInt(parts[4]) || 0, parseInt(parts[5]) || 0);
      }
    } catch (parseError) {
      console.warn(`Could not parse date string: ${dateStr}`, e, parseError);
    }
    return null;
  }
};


export async function generateMetadata(
  { params }: EventDetailsPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const event = await getEventBySlug(params.slug); // Fetches from API

  if (!event) {
    return {
      title: 'Event Not Found',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: event.name,
    description: event.description?.substring(0, 160) || "Event details for " + event.name,
    openGraph: {
      title: event.name,
      description: event.description?.substring(0, 100) || "Event details",
      images: [
        {
          url: event.imageUrl || '/og-default.png', 
          width: 800,
          height: 450,
          alt: event.name,
        },
        ...previousImages,
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: event.description?.substring(0, 100) || "Event details",
      images: [event.imageUrl || '/og-default.png'],
    },
  };
}

// generateStaticParams might need to be re-evaluated if slugs are dynamic from API
// For now, removing it as it might cause issues if API slugs change frequently or are numerous
// export async function generateStaticParams() { ... }

export default async function EventDetailsPage({ params: { slug } }: EventDetailsPageProps) {
  const event = await getEventBySlug(slug); // Fetches from API

  if (!event) {
    return (
        <div className="container mx-auto py-12 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-semibold">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">The event you are looking for does not exist or could not be loaded.</p>
            <Button asChild>
                <Link href="/search">Browse Other Events</Link>
            </Button>
        </div>
    );
  }

  const mainEventDateObj = safeParseDate(event.date);
  const formattedMainEventDate = mainEventDateObj 
    ? format(mainEventDateObj, "EEEE, MMMM do, yyyy") 
    : "Date TBD";
  
  // Venue details from top-level event properties
  const venueName = event.venueName;
  const venueAddress = event.venueAddress;
  // mapLink might need to be constructed if not directly provided by API, e.g., from venueAddress
  // For now, we'll assume event.mapLink exists if provided by API, or we construct it.
  const venueMapLink = event.mapLink || (venueAddress ? `https://maps.google.com/?q=${encodeURIComponent(venueAddress)}` : undefined);


  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="p-0">
              <Image
                src={event.imageUrl || "https://placehold.co/800x450.png"}
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
                dangerouslySetInnerHTML={{ __html: event.description || "<p>No description available.</p>" }} 
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          {event.organizer ? (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-lg">{event.organizer.name}</p>
                {event.organizer.contactEmail && <p className="text-sm text-muted-foreground">{event.organizer.contactEmail}</p>}
                {event.organizer.website && (
                  <a href={event.organizer.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block">
                    Visit Website
                  </a>
                )}
              </CardContent>
            </Card>
          ) : event.organizerId ? (
             <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground">Organizer ID: {event.organizerId}</p>
                 <p className="text-xs text-muted-foreground italic">(Full organizer details not loaded)</p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-primary" /> Venue Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{venueName || "Venue TBD"}</p>
              {venueAddress && (
                <p className="text-sm text-muted-foreground">{venueAddress}</p>
              )}
              {venueMapLink && (
                <a href={venueMapLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block">
                  View on Map
                </a>
              )}
               {!venueAddress && !venueMapLink && !venueName && (
                 <p className="text-sm text-muted-foreground">Detailed venue information not available.</p>
               )}
            </CardContent>
          </Card>

          {event.showTimes && event.showTimes.length > 0 ? (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6 text-primary" /> Showtimes &amp; Tickets</CardTitle>
                <CardDescription>Select tickets for your preferred showtime on the booking page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {event.showTimes.map((showTime, index) => {
                  const showDateTimeObj = safeParseDate(showTime.dateTime);
                  const formattedShowDate = showDateTimeObj ? format(showDateTimeObj, "EEEE, MMMM do, yyyy") : "Date TBD";
                  const formattedShowTime = showDateTimeObj ? format(showDateTimeObj, "p") : "Time TBD";
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
          ) : (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-6 w-6 text-primary" /> Showtimes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No specific showtimes listed. Check the booking page or contact the organizer.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
