
"use client";

import { getEventBySlug } from '@/lib/mockData'; // Updated to use API fetching
import TicketSelector from '@/components/events/TicketSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarClock, Loader2, AlertTriangle } from 'lucide-react';
import type { Event } from '@/lib/types';
import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';

interface BookEventPageProps {
  params: { slug: string };
}

// Helper to safely parse date strings from API
const safeParseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch (e) {
     try { // Fallback for "YYYY-MM-DD HH:MM:SS"
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


export default function BookEventPage({ params: { slug } }: BookEventPageProps) {
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [selectedShowTimeId, setSelectedShowTimeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      setIsLoading(true);
      try {
        const eventData = await getEventBySlug(slug); // Fetches from API
        setEvent(eventData);
        if (eventData && eventData.showTimes && eventData.showTimes.length === 1) {
          setSelectedShowTimeId(eventData.showTimes[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
        setEvent(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEventData();
  }, [slug]);

  useEffect(() => {
    if (event && typeof window !== 'undefined') {
        document.title = `Book Tickets for ${event.name} | MyPass.lk`;
    } else if (event === null && typeof window !== 'undefined') {
        document.title = 'Event Not Found | MyPass.lk';
    }
  }, [event]);


  if (isLoading) {
    return (
      <div className="container mx-auto py-12 text-center flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Event Not Found</h2>
        <p className="text-muted-foreground mb-4">The event you are looking for does not exist or an error occurred.</p>
        <Button asChild><Link href="/search">Browse Other Events</Link></Button>
      </div>
    );
  }
  
  if (!event || !event.showTimes || event.showTimes.length === 0) {
     return (
      <div className="container mx-auto py-12 text-center">
        <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold">No Showtimes Available</h2>
        <p className="text-muted-foreground mb-4">There are currently no showtimes scheduled for this event.</p>
        <Button asChild><Link href={`/events/${slug}`}>Back to Event Details</Link></Button>
      </div>
    );
  }

  const selectedShowTimeObject = event.showTimes.find(st => st.id === selectedShowTimeId);
  
  const mainEventDateObj = safeParseDate(event.date);
  const formattedMainDate = mainEventDateObj 
    ? format(mainEventDateObj, "EEEE, MMMM do, yyyy") 
    : "Date TBD";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href={`/events/${event.slug}`} className="text-sm text-primary hover:underline">&larr; Back to Event Details</Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-8">
          {event.showTimes.length > 1 && !selectedShowTimeObject && (
            <Card>
              <CardHeader>
                <CardTitle>Select a Showtime</CardTitle>
                <CardDescription>This event has multiple showtimes. Please choose one to proceed.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedShowTimeId || ""} onValueChange={setSelectedShowTimeId} className="space-y-3">
                  {event.showTimes.map((st) => {
                    const showDateTimeObj = safeParseDate(st.dateTime);
                    const formattedShowDate = showDateTimeObj ? format(showDateTimeObj, "E, MMM d, yyyy") : "Invalid Date";
                    const formattedShowTime = showDateTimeObj ? format(showDateTimeObj, "p") : "Invalid Time";
                    return (
                      <Label
                        key={st.id}
                        htmlFor={st.id}
                        className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary"
                      >
                        <RadioGroupItem value={st.id} id={st.id} />
                        <div className="flex-grow">
                          <span className="font-medium text-foreground">
                            {formattedShowDate}
                          </span>
                          <span className="text-primary font-semibold mx-1.5">-</span>
                          <span className="text-foreground">
                            {formattedShowTime}
                          </span>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {selectedShowTimeObject && (
            <TicketSelector event={event} selectedShowTime={selectedShowTimeObject} />
          )}
           
          {selectedShowTimeObject && ( // Show checkout button only if a showtime is selected
            <div className="mt-8 flex justify-end">
             <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/checkout">
                  Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
           </div>
          )}
        </div>

        <div className="md:col-span-1">
          <Card className="sticky top-24 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">{event.name}</CardTitle>
              <CardDescription>
                Main Event Date: {formattedMainDate} <br />
                At {event.venueName || "Venue TBD"}, {event.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video relative rounded-md overflow-hidden">
                <Image 
                  src={event.imageUrl || "https://placehold.co/600x400.png"} 
                  alt={event.name} 
                  fill
                  style={{objectFit: 'cover'}}
                  className="rounded-md"
                  data-ai-hint="event poster"
                />
              </div>
               {selectedShowTimeObject && (
                <div className="mt-4 p-3 bg-primary/10 rounded-md">
                  <p className="text-sm font-semibold text-primary">Selected Showtime:</p>
                  <p className="text-sm text-foreground">
                    {safeParseDate(selectedShowTimeObject.dateTime) ? 
                        format(safeParseDate(selectedShowTimeObject.dateTime)!, "EEEE, MMMM do, yyyy 'at' p") 
                        : "Invalid date"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
