
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, DollarSign, Tag, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getEventCount, getBookingCount, getUserCount } from '@/lib/mockData';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    events: null as number | null,
    bookings: null as number | null,
    users: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Admin Dashboard | GoTickets.lk';
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [eventCount, bookingCount, userCount] = await Promise.all([
          getEventCount(),
          getBookingCount(),
          getUserCount(),
        ]);
        setStats({
          events: eventCount,
          bookings: bookingCount,
          users: userCount,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
        // Optionally set an error state to show in the UI
        setStats({ events: 0, bookings: 0, users: 0 }); // Show 0 on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, note }: { title: string; value: number | null; icon: React.ElementType, note: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24 mt-2" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{note}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the GoTickets.lk admin panel.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Events" value={stats.events} icon={BarChart} note="Live data from server" />
        <StatCard title="Total Bookings" value={stats.bookings} icon={DollarSign} note="Live data from server" />
        <StatCard title="Registered Users" value={stats.users} icon={Users} note="Live data from server" />
        
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Manage Categories</span>
                  <Tag className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
              <p className="text-xs text-muted-foreground mt-2">
                  Organize your events by adding or editing categories.
              </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
                <Link href="/admin/categories">
                    Go to Categories
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild>
              <Link href="/admin/events/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Event
              </Link>
            </Button>
            <p className="text-muted-foreground text-sm mt-2">More actions can be added here as needed.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-600 font-semibold">All systems operational.</p>
            <p className="text-xs text-muted-foreground mt-1">Last check: Just now (mock)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
