
import { getEventBySlug } from '@/lib/mockData';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import EventDetailsClientView from '@/components/events/EventDetailsClientView';
import { SITE_URL } from '@/lib/constants';

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

  const cleanDescription = event.description?.replace(/<[^>]*>?/gm, '').substring(0, 160) || `Details for ${event.name}`;
  const pageUrl = `${SITE_URL}/events/${event.slug}`;
  
  // Ensure the image URL is absolute
  let absoluteImageUrl = event.imageUrl || `${SITE_URL}/og-default.png`;
  if (absoluteImageUrl.startsWith('/')) {
    absoluteImageUrl = `${SITE_URL}${absoluteImageUrl}`;
  }

  return {
    title: event.name,
    description: cleanDescription,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: event.name,
      description: cleanDescription,
      url: pageUrl,
      siteName: 'GoTickets.lk',
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
      type: 'article', // More specific than 'website' for an event page
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: cleanDescription,
      images: [absoluteImageUrl],
    },
  };
}

export default async function EventDetailsPage({ params: { slug } }: EventDetailsPageProps) {
  const event = await getEventBySlug(slug);

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
  
  // JSON-LD Structured Data for Rich Search Results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: event.date,
    endDate: event.date, // Assuming single day event for simplicity; could be adapted if end date is available
    location: {
      '@type': 'Place',
      name: event.venueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venueAddress || event.location,
        addressLocality: event.location.split(',')[0].trim(),
        addressCountry: 'LK', // Assuming Sri Lanka
      },
    },
    image: [event.imageUrl],
    description: event.description?.replace(/<[^>]*>?/gm, '').substring(0, 500) || `Details for ${event.name}`,
    offers: {
      '@type': 'AggregateOffer',
      url: `${SITE_URL}/events/${event.slug}/book`,
      priceCurrency: 'LKR',
      lowPrice: event.ticketTypes ? Math.min(...event.ticketTypes.map(t => t.price)) : 0,
      highPrice: event.ticketTypes ? Math.max(...event.ticketTypes.map(t => t.price)) : 0,
    },
    organizer: {
        '@type': 'Organization',
        name: event.organizer?.name || 'GoTickets.lk',
        url: event.organizer?.website || SITE_URL,
    }
  };

  return (
    <>
      <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetailsClientView event={event} />
    </>
  );
}
