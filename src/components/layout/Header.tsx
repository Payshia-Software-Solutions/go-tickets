
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search, Ticket, UserCircle, LogOut, Home, CalendarDays, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const Header = () => {
  const { user, logout, loading } = useAuth();
  const { totalItems } = useCart();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const UserNav = () => {
    if (loading) {
      return <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />;
    }
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name || user.email} />
                <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}</AvatarFallback>
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
            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
              <Ticket className="mr-2 h-4 w-4" />
              <span>My Bookings</span>
            </DropdownMenuItem>
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
        <Button variant="outline" onClick={() => router.push('/login')}>Login</Button>
        <Button onClick={() => router.push('/signup')}>Sign Up</Button>
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Ticket className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">Event Horizon</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
            <Input
              type="search"
              placeholder="Search events..."
              className="h-9 md:w-[200px] lg:w-[250px] pr-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="ghost" size="icon" className="absolute right-0 top-1/2 transform -translate-y-1/2 h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <Button variant="ghost" size="icon" onClick={() => router.push('/checkout')} className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>

          <div className="hidden md:block">
            <UserNav />
          </div>

          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col space-y-4 p-4">
                  <Link href="/" className="flex items-center space-x-2 mb-4" onClick={() => setIsMobileMenuOpen(false)}>
                     <Ticket className="h-7 w-7 text-primary" />
                     <span className="font-bold text-lg">Event Horizon</span>
                  </Link>
                  <form onSubmit={handleSearch} className="flex items-center relative w-full">
                    <Input
                      type="search"
                      placeholder="Search events..."
                      className="h-9 pr-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                     <Button type="submit" variant="ghost" size="icon" className="absolute right-0 top-1/2 transform -translate-y-1/2 h-9 w-9">
                       <Search className="h-4 w-4" />
                     </Button>
                  </form>
                  <nav className="flex flex-col space-y-2 text-base">
                    <NavLinks inSheet />
                  </nav>
                  <div className="mt-auto">
                    {user ? (
                      <>
                        <Button variant="ghost" className="w-full justify-start mb-2" onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }}>
                          <Ticket className="mr-2 h-4 w-4" /> My Bookings
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                          <LogOut className="mr-2 h-4 w-4" /> Logout
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <Button variant="outline" className="w-full" onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }}>Login</Button>
                        <Button className="w-full" onClick={() => { router.push('/signup'); setIsMobileMenuOpen(false); }}>Sign Up</Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
