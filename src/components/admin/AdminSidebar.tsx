
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Ticket, LogOut, Users, Tag, QrCode, UserCog, FileText, ClipboardCheck, BookCopy, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/organizers', label: 'Organizers', icon: Users },
  { href: '/admin/users', label: 'Users', icon: UserCog },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { href: '/admin/verifications', label: 'Verifications', icon: ClipboardCheck },
  { 
    label: 'Reports', 
    icon: FileText,
    href: '/admin/reports', // Base href for parent
    children: [
      { href: '/admin/reports', label: 'Booking Report', icon: FileText },
      { href: '/admin/reports/tickets', label: 'Ticket Report', icon: BookCopy },
      { href: '/admin/reports/event-summary', label: 'Event Summary', icon: TrendingUp },
    ]
  },
  { href: '/admin/verify-ticket', label: 'Verify Ticket', icon: QrCode },
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
      <nav className="flex-grow p-4 space-y-1">
        <Accordion type="multiple" defaultValue={pathname.startsWith('/admin/reports') ? ['reports-item'] : []}>
          {adminNavItems.map((item, index) => (
            item.children ? (
              <AccordionItem key={`menu-item-${index}`} value="reports-item" className="border-b-0">
                <AccordionTrigger
                  className={cn(
                    "flex items-center w-full space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors hover:no-underline",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    pathname.startsWith(item.href)
                      ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-6 pt-1 pb-0">
                  <div className="flex flex-col space-y-1 border-l border-muted-foreground/30 ml-1.5">
                    {item.children.map(child => {
                      const isChildActive = pathname === child.href;
                      return (
                         <Link key={child.href} href={child.href} legacyBehavior>
                           <a
                              onClick={handleLinkClick}
                              className={cn(
                                'flex items-center space-x-3 pl-4 pr-3 py-2 rounded-r-md text-sm font-medium transition-colors border-l-2',
                                isChildActive
                                  ? 'bg-primary/10 text-primary border-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.label}</span>
                            </a>
                          </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <Link key={item.href} href={item.href} legacyBehavior>
                <a
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith(item.href) && item.href !== '/admin/dashboard' || pathname === item.href
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </a>
              </Link>
            )
          ))}
        </Accordion>
      </nav>
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" className="flex-grow justify-start text-muted-foreground hover:text-destructive" onClick={() => { logout(); handleLinkClick(); }}>
              <LogOut className="mr-2 h-4 w-4" /> 
              <span>Logout</span>
            </Button>
            <ThemeToggle />
        </div>
         <Link href="/" legacyBehavior>
            <a onClick={handleLinkClick} className="mt-2 text-xs text-center block text-muted-foreground hover:text-primary">Back to Site</a>
        </Link>
      </div>
    </aside>
  );
}
