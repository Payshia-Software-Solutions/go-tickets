
"use client";

import { useEffect, useState, Suspense, type FC } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchEvents } from '@/lib/mockData';
import type { Event } from '@/lib/types';
import EventCard from '@/components/events/EventCard';
import EventFilters from '@/components/events/EventFilters';
import { Loader2, SearchX, SlidersHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import * as fpixel from '@/lib/fpixel';

const SearchResultsDisplay: FC = () => {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Search Events');
  const query = searchParams.get('query');
  const category = searchParams.get('category');

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      const queryParam = searchParams.get('query') || undefined;
      const categoryParam = searchParams.get('category') || undefined;
      const date = searchParams.get('date') || undefined;
      const location = searchParams.get('location') || undefined;
      
      let title = 'Browse All Events | GoTickets.lk';
      if (queryParam) {
        title = `Search results for "${queryParam}" | GoTickets.lk`;
        fpixel.track('Search', { search_string: queryParam });
      } else if (categoryParam) {
        title = `${categoryParam} Events | GoTickets.lk`;
      }
      setPageTitle(title);

      const events = await searchEvents(queryParam, categoryParam, date, location);
      setResults(events);
      setIsLoading(false);
    };

    fetchResults();
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-slate-500">Searching for events...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[400px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
        <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
          <SearchX className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Events Found</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">Try adjusting your search criteria or browse all events to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {query ? `Results for "${query}"` : category ? `${category} Events` : 'All Events'}
        </h2>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
        {results.map((event, idx) => (
          <EventCard key={event.id} event={event} index={idx} />
        ))}
      </div>
    </>
  );
};

const SearchContentWrapper: FC = () => {
    const searchParams = useSearchParams();
    const suspenseKey = searchParams.toString();

    return (
        <Suspense
            key={suspenseKey}
            fallback={
              <div className="flex flex-col justify-center items-center py-20 min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium text-slate-500">Loading search results...</p>
              </div>
            }
          >
            <SearchResultsDisplay />
        </Suspense>
    );
};

const FilterSkeleton = () => (
  <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-6 animate-pulse">
    <Skeleton className="h-6 w-1/3 mb-4" />
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-4 w-1/4 mb-2 bg-slate-100" />
          <Skeleton className="h-10 w-full bg-slate-100 rounded-xl" />
        </div>
      ))}
    </div>
    <Skeleton className="h-12 w-full bg-slate-200 rounded-xl mt-4" />
  </div>
);


export default function SearchPage() {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const handleFiltersApplied = () => {
    setIsMobileFiltersOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20">
      {/* Header */}
      <section className="bg-slate-900 text-white py-12 md:py-16 mb-8">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-4">
            <Search className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Find Your Perfect Event</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Browse through our extensive catalog of events across Sri Lanka.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4">
        {/* Mobile Filters Toggle */}
        <div className="lg:hidden mb-6">
          <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button className="w-full h-12 bg-white dark:bg-card text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold rounded-xl shadow-sm">
                <SlidersHorizontal className="mr-2 h-5 w-5 text-primary" />
                Filter Events
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 border-r-0">
              <SheetHeader className="p-6 pb-0">
                <SheetTitle className="text-left font-bold text-xl">Filters</SheetTitle>
              </SheetHeader>
              <div className="p-6">
                <Suspense fallback={<FilterSkeleton />}>
                  <EventFilters onSearch={handleFiltersApplied} />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-full lg:w-[320px] shrink-0 sticky top-24">
            <Suspense fallback={<FilterSkeleton />}>
              <EventFilters />
            </Suspense>
          </aside>

          {/* Search Results */}
          <main className="flex-1 w-full min-w-0">
            <Suspense fallback={ 
               <div className="flex flex-col justify-center items-center py-20 min-h-[400px]">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium text-slate-500">Loading content...</p>
               </div>
            }>
              <SearchContentWrapper />
            </Suspense>
          </main>
          
        </div>
      </div>
    </div>
  );
}
