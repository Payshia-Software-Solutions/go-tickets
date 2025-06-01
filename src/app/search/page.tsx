
"use client"; 

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchEvents } from '@/lib/mockData';
import type { Event } from '@/lib/types';
import EventCard from '@/components/events/EventCard';
import EventFilters from '@/components/events/EventFilters';
import { Loader2, SearchX, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 col-span-1 lg:col-span-3">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Searching for events...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-20 col-span-1 lg:col-span-3">
        <SearchX className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Events Found</h2>
        <p className="text-muted-foreground">Try adjusting your search criteria or browse all events.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
      {results.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}


export default function SearchPage() {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const handleFiltersApplied = () => {
    setIsMobileFiltersOpen(false); // Close sheet after applying filters
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Find Your Perfect Event</h1>
      </div>

      <div className="lg:hidden mb-6">
        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="mr-2 h-5 w-5" />
              Show Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
            <SheetHeader className="p-6 pb-0">
              <SheetTitle>Filter Events</SheetTitle>
            </SheetHeader>
            <div className="p-6">
              <EventFilters onSearch={handleFiltersApplied} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-8">
        <aside className="hidden lg:block lg:col-span-1 sticky top-20 self-start h-auto">
          <h2 className="text-xl font-semibold mb-4 font-headline">Filters</h2>
          <EventFilters />
        </aside>

        <main className="lg:col-span-3">
          <Suspense fallback={
            <div className="flex justify-center items-center py-20 col-span-1 lg:col-span-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg text-muted-foreground">Loading search results...</p>
            </div>
          }>
            <SearchResults />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
