
import { getEventBySlug } from '@/lib/mockData'; // Updated to use API fetching
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import EventDetailsClientView from '@/components/events/EventDetailsClientView';

interface EventDetailsPageProps {
  params: { slug: string };
}

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

  return <EventDetailsClientView event={event} />;
}
