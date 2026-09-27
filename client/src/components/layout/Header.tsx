
"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { Event } from '@/lib/types';
import { getEventSuggestionsByName } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search, Ticket, LogOut, ShoppingCart, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import SearchModal from '@/components/events/SearchModal';

const getInitial = (name?: string | null, email?: string): string => {
  if (name && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.trim().charAt(0).toUpperCase();
  }
  return 'U'; // Default fallback
};

const Header = () => {
  const { user, logout, loading } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { setTheme } = useTheme(); // Removed unused 'theme'
  const [mounted, setMounted] = useState(false);

  // --- New state and ref for search suggestions ---
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Ctrl+K / Cmd+K listener to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- New useEffect for fetching suggestions ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) { // Fetch suggestions for 2+ characters
        const suggestions = await getEventSuggestionsByName(searchQuery.trim());
        setSuggestedEvents(suggestions.slice(0, 5)); // Limit to 5 suggestions
        setShowSuggestions(suggestions.length > 0);
      } else {
        setSuggestedEvents([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // --- New useEffect for handling outside clicks ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  // --- Updated handleSearch function ---
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setSearchQuery('');
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    }
  };

  // --- New handler for when a suggestion is clicked ---
  const handleSuggestionClick = () => {
    setShowSuggestions(false);
    setSearchQuery('');
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const ThemeToggleButton = () => {
    if (!mounted) {
      return (
        <Button variant="ghost" size="icon" disabled className="h-9 w-9" suppressHydrationWarning>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme (loading)</span>
        </Button>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" suppressHydrationWarning>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const UserNav = () => {
    if (loading) {
      return <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />;
    }
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full" suppressHydrationWarning>
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name || user.email || 'User avatar'} />
                <AvatarFallback>{getInitial(user.name, user.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/account_dashboard')}>
              <Ticket className="mr-2 h-4 w-4" />
              <span>My Bookings</span>
            </DropdownMenuItem>
            {user.isAdmin && (
              <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <div className="space-x-2">
        <Button variant="outline" onClick={() => router.push('/login')} suppressHydrationWarning>Login</Button>
        <Button onClick={() => router.push('/signup')} suppressHydrationWarning>Sign Up</Button>
      </div>
    );
  };

  const NavLinks = ({ inSheet = false }: { inSheet?: boolean}) => (
    <>
      <Link href="/" className={`hover:text-primary transition-colors ${inSheet ? 'py-2 block' : ''}`} onClick={() => inSheet && setIsMobileMenuOpen(false)}>Home</Link>
      <Link href="/search" className={`hover:text-primary transition-colors ${inSheet ? 'py-2 block' : ''}`} onClick={() => inSheet && setIsMobileMenuOpen(false)}>Browse Events</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center">
             <span className="text-2xl font-bold font-headline">GoTickets<span className="text-primary">.</span><span className="text-accent">lk</span></span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* --- Desktop Search Trigger Button (TicketsMinistry style) --- */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-full border border-border/80 bg-muted/30 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-medium md:w-[170px] lg:w-[240px] transition-all justify-between shadow-xs cursor-pointer group"
            title="Search events (Ctrl+K)"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Search events...</span>
            </span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 pointer-events-none h-5 select-none rounded border border-border/80 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Mobile Search Icon Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchModalOpen(true)}
            className="md:hidden"
            suppressHydrationWarning
            title="Search events"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => router.push('/checkout')} className="relative" suppressHydrationWarning>
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Button>

          <ThemeToggleButton />

          <div className="hidden md:block">
            <UserNav />
          </div>

          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" suppressHydrationWarning>
                  <Menu className="h-6 w-6" />
                   <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <div className="flex flex-col space-y-4">
                    <Link href="/" className="flex items-center mb-4" onClick={() => setIsMobileMenuOpen(false)}>
                       <span className="text-xl font-bold font-headline">GoTickets<span className="text-primary">.</span><span className="text-accent">lk</span></span>
                    </Link>
                    {/* Mobile search trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsSearchModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground text-sm font-medium w-full text-left transition-colors"
                    >
                      <Search className="h-4 w-4 text-primary shrink-0" />
                      <span>Search events, venues...</span>
                    </button>
                    <nav className="flex flex-col space-y-2 text-base">
                      <NavLinks inSheet />
                    </nav>
                    <div className="mt-auto border-t pt-4">
                      {user ? (
                        <>
                          <div className="flex items-center mb-3">
                              <Avatar className="h-10 w-10 mr-2">
                                  <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name || user.email || 'User avatar'} />
                                  <AvatarFallback>{getInitial(user.name, user.email)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                              </div>
                          </div>
                          <Button variant="ghost" className="w-full justify-start mb-2" onClick={() => { router.push('/account_dashboard'); setIsMobileMenuOpen(false); }} suppressHydrationWarning>
                            <Ticket className="mr-2 h-4 w-4" /> My Bookings
                          </Button>
                          {user.isAdmin && (
                            <Button variant="ghost" className="w-full justify-start mb-2" onClick={() => { router.push('/admin/dashboard'); setIsMobileMenuOpen(false); }} suppressHydrationWarning>
                              <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
                            </Button>
                          )}
                          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive/90" onClick={() => { logout(); setIsMobileMenuOpen(false); }} suppressHydrationWarning>
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" className="w-full" onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }} suppressHydrationWarning>Login</Button>
                          <Button className="w-full" onClick={() => { router.push('/signup'); setIsMobileMenuOpen(false); }} suppressHydrationWarning>Sign Up</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* --- Rich Interactive Search Modal --- */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
      />
    </header>
  );
};

export default Header;
