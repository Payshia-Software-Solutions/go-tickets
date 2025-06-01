
"use client"; // To use useSearchParams

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchEvents } from '@/lib/mockData';
import type { Event } from '@/lib/types';
import EventCard from '@/components/events/EventCard';
import EventFilters from '@/components/events/EventFilters';
import { Loader2, SearchX } from 'lucide-react';

function SearchResults() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      const query = searchParams.get('query') || undefined;
      const category = searchParams.get('category') || undefined;
      const date = searchParams.get('date') || undefined;
      const location = searchParams.get('location') || undefined;
      const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
      const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
      
      const events = await searchEvents(query, category, date, location, minPrice, maxPrice);
      setResults(events);
      setIsLoading(false);
    };

    fetchResults();
  }, [searchParams]);

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Searching for events...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {results.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <SearchX className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Events Found</h2>
          <p className="text-muted-foreground">Try adjusting your search criteria or browse all events.</p>
        </div>
      )}
    </div>
  );
}


export default function SearchPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold font-headline text-center">Find Your Perfect Event</h1>
      <EventFilters />
      <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg text-muted-foreground">Loading search results...</p></div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
