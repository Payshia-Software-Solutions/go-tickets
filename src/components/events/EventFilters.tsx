
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getEventCategories } from '@/lib/mockData'; // Updated to use API-calling service
import { CalendarIcon, MapPin, Tag, Search as SearchIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface EventFiltersProps {
  onSearch?: () => void;
}

const ALL_CATEGORIES_ITEM_VALUE = "__ALL_CATEGORIES_SENTINEL__";

const EventFilters: React.FC<EventFiltersProps> = ({ onSearch }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('query') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [date, setDate] = useState<Date | undefined>(searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      const cats = await getEventCategories(); // Now fetches from API
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
    if (category) params.set('category', category);
    if (date) params.set('date', format(date, 'yyyy-MM-dd'));

    router.push(`/search?${params.toString()}`);
    if (onSearch) {
      onSearch();
    }
  };

  const handleCategoryChange = (selectedValue: string) => {
    if (selectedValue === ALL_CATEGORIES_ITEM_VALUE) {
      setCategory('');
    } else {
      setCategory(selectedValue);
    }
  };

  return (
    <form onSubmit={handleSearch} className="p-6 bg-card rounded-xl shadow-lg space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <label htmlFor="searchTerm" className="text-sm font-medium">Search Event</label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchTerm"
              placeholder="Event name, keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              placeholder="City, venue..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          {isLoadingCategories ? (
            <div className="flex items-center h-10 border rounded-md px-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> 
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger id="category" className="w-full">
                <div className="flex items-center">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Categories" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_ITEM_VALUE}>All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="date" className="text-sm font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
        <SearchIcon className="mr-2 h-4 w-4" /> Find Events
      </Button>
    </form>
  );
};

export default EventFilters;
