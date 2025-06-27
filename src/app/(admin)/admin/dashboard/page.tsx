
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart as BarChartIcon, Users, DollarSign, Tag, PieChart as PieChartIcon, Activity, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getEventCount, getBookingCount, getUserCount, adminGetAllEvents, adminGetAllBookings } from '@/lib/mockData';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event, Booking } from '@/lib/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from "@/components/ui/chart"
import { format, subDays, parseISO } from 'date-fns';

// Helper for sales chart data processing
const processSalesData = (bookings: Booking[]) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return format(d, 'yyyy-MM-dd');
  }).reverse();

  const dailySales: { [key: string]: number } = last7Days.reduce((acc, dateStr) => {
    acc[dateStr] = 0;
    return acc;
  }, {} as { [key: string]: number });

  bookings.forEach(booking => {
    try {
      const bookingDate = format(parseISO(booking.bookingDate), 'yyyy-MM-dd');
      if (dailySales.hasOwnProperty(bookingDate)) {
        dailySales[bookingDate] += booking.totalPrice;
      }
    } catch (e) {
      console.warn(`Could not parse booking date: ${booking.bookingDate}`);
    }
  });
  
  return last7Days.map(dateStr => ({
    date: format(new Date(dateStr), 'MMM d'),
    sales: dailySales[dateStr],
  }));
};

// Helper for category chart data processing
const processCategoryData = (events: Event[]) => {
  const categoryCounts = events.reduce((acc, event) => {
    const category = event.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  return Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];


export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    events: null as number | null,
    bookings: null as number | null,
    users: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // State for chart data
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Admin Dashboard | GoTickets.lk';
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setIsChartLoading(true);
      try {
        const [eventCount, bookingCount, userCount, allEvents, allBookings] = await Promise.all([
          getEventCount(),
          getBookingCount(),
          getUserCount(),
          adminGetAllEvents(),
          adminGetAllBookings(),
        ]);
        setStats({
          events: eventCount,
          bookings: bookingCount,
          users: userCount,
        });

        // Process and set chart data
        setSalesData(processSalesData(allBookings));
        setCategoryData(processCategoryData(allEvents));

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        setStats({ events: 0, bookings: 0, users: 0 }); // Show 0 on error
        setSalesData([]);
        setCategoryData([]);
      } finally {
        setIsLoading(false);
        setIsChartLoading(false);
      }
    };
    fetchAllData();
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
        <StatCard title="Total Events" value={stats.events} icon={BarChartIcon} note="Live data from server" />
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5" /> Recent Sales</CardTitle>
            <CardDescription>Total sales over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : salesData.length > 0 ? (
                <ChartContainer config={{
                  sales: {
                    label: 'Sales',
                    color: 'hsl(var(--chart-1))',
                  },
                }} className="h-[250px] w-full">
                  <BarChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                  </BarChart>
                </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No sales data in the last 7 days.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><PieChartIcon className="mr-2 h-5 w-5" /> Event Categories</CardTitle>
             <CardDescription>Distribution of events by category.</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : categoryData.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (percent > 0.05) ? (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      ) : null;
                    }}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[250px] flex items-center justify-center">No event categories to display.</p>
            )}
          </CardContent>
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
