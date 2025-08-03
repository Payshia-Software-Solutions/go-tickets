
"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || !user.isAdmin) {
        router.replace('/login?redirect=/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || !user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 z-20">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 md:hidden">
          <AdminSidebar onLinkClick={() => setIsMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:ml-64">
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {/* Mobile Header with Hamburger */}
          <header className="md:hidden mb-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10 -mx-4 px-4 py-2 border-b">
            <Button variant="outline" size="icon" onClick={() => setIsMobileSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </Button>
            <Link href="/admin/dashboard" onClick={() => setIsMobileSidebarOpen(false)}>
              <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
            </Link>
            <div className="w-10"></div> {/* Spacer for alignment */}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
