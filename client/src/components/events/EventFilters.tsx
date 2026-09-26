
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getEventCategories } from '@/lib/mockData'; 
import type { Category } from '@/lib/types';
import { CalendarIcon, MapPin, Tag, Search as SearchIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventFiltersProps {
  onSearch?: () => void;
}

const ALL_CATEGORIES_ITEM_VALUE = "__ALL_CATEGORIES_SENTINEL__";

const EventFilters: React.FC<EventFiltersProps> = ({ onSearch }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('query') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [selectedCategoryName, setSelectedCategoryName] = useState(searchParams.get('category') || '');
  const [date, setDate] = useState<Date | undefined>(searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      const cats = await getEventCategories();
      setCategories(cats);
      setIsLoadingCategories(false);
    };
    fetchCategories();
  }, []);

  const handleSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('query', searchTerm);
    if (location) params.set('location', location);
    if (selectedCategoryName) params.set('category', selectedCategoryName);
    if (date) params.set('date', format(date, 'yyyy-MM-dd'));

    router.push(`/search?${params.toString()}`);
    if (onSearch) {
      onSearch();
    }
  };

  const handleCategoryChange = (selectedValue: string) => {
    if (selectedValue === ALL_CATEGORIES_ITEM_VALUE) {
      setSelectedCategoryName('');
    } else {
      setSelectedCategoryName(selectedValue);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocation('');
    setSelectedCategoryName('');
    setDate(undefined);
    router.push('/search');
    if (onSearch) onSearch();
  };

  const hasActiveFilters = searchTerm || location || selectedCategoryName || date;

  return (
    <form onSubmit={handleSearch} className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <SearchIcon className="h-5 w-5 text-accent" />
          Search Filters
        </h3>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">
            Clear all
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Search Keyword */}
        <div className="space-y-2">
          <label htmlFor="searchTerm" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keyword</label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              id="searchTerm"
              placeholder="Event name, artist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-accent"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              id="location"
              placeholder="City, venue..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-accent"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
          {isLoadingCategories ? (
            <div className="flex items-center h-11 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500" /> 
                <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading categories...</span>
            </div>
          ) : (
            <Select value={selectedCategoryName} onValueChange={handleCategoryChange}>
              <SelectTrigger id="category" className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-accent">
                <div className="flex items-center">
                  <Tag className="mr-2 h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <SelectValue placeholder="All Categories" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_ITEM_VALUE}>All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={String(cat.id)} value={cat.name}>{cat.name}</SelectItem> 
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-accent hover:bg-slate-100 dark:hover:bg-slate-800",
                  !date && "text-slate-500 dark:text-slate-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                {date ? format(date, "PPP") : <span>Pick a specific date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="rounded-xl border border-slate-200"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button type="submit" className="w-full h-12 text-base font-bold bg-accent hover:bg-accent/90 text-white rounded-xl">
            Apply Filters
          </Button>
        </div>
      </div>
    </form>
  );
};

export default EventFilters;
