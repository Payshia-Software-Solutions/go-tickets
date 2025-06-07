
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Ticket, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/organizers', label: 'Organizers', icon: Users },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket },
];

interface AdminSidebarProps {
  onLinkClick?: () => void;
}

export default function AdminSidebar({ onLinkClick }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <aside className="w-full h-full bg-muted/40 border-r border-border flex flex-col">
      <div className="p-4 border-b">
        <Link href="/admin/dashboard" onClick={handleLinkClick}>
          <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
        </Link>
      </div>
      <nav className="flex-grow p-4 space-y-2">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={() => { logout(); handleLinkClick(); }}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
         <Link href="/" legacyBehavior>
            <a onClick={handleLinkClick} className="mt-2 text-xs text-center block text-muted-foreground hover:text-primary">Back to Site</a>
        </Link>
      </div>
    </aside>
  );
}
