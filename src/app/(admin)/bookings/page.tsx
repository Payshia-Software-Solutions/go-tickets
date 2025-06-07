
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import type { Metadata } from 'next';

// Client component, dynamic title set via useEffect
// export const metadata: Metadata = {
//   title: 'Manage Bookings',
//   robots: { index: false, follow: true },
// };

export default function AdminBookingsPage() {
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Bookings | MyPass.lk Admin';
    }
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground font-headline">Manage Bookings</h1>
        <p className="text-muted-foreground">View and manage all event bookings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>This feature is under development.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Booking management functionality will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
