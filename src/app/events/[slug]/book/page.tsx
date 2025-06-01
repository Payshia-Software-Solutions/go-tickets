
import { getEventBySlug } from '@/lib/mockData';
import TicketSelector from '@/components/events/TicketSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import Image from 'next/image';

export async function generateStaticParams() {
  const mockEventSlugs = ['tech-conference-2024', 'summer-music-fest', 'art-exhibition-modern', 'charity-gala-night', 'sports-championship-final', 'local-theater-play'];
  return mockEventSlugs.map((slug) => ({
    slug,
  }));
}

export default async function BookEventPage({ params: { slug } }: { params: { slug: string } }) {
  const event = await getEventBySlug(slug);

  if (!event) {
    return <div className="container mx-auto py-12 text-center">Event not found.</div>;
  }
  
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href={`/events/${event.slug}`} className="text-sm text-primary hover:underline">&larr; Back to Event Details</Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
           <TicketSelector event={event} />
           <div className="mt-8 flex justify-end">
             <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/checkout">
                  Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
           </div>
        </div>
        <div className="md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription>
                {formattedDate} at {formattedTime} <br />
                {event.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Image 
                src={event.imageUrl} 
                alt={event.name} 
                width={400} 
                height={200} 
                className="rounded-md object-cover w-full aspect-video"
                data-ai-hint="event poster"
              />
              {/* Potentially show a mini cart summary here if useCart provides necessary details */}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
