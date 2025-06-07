
"use client";

import { useEffect, useState } from 'react';
import type { Event } from '@/lib/types';
import { adminGetAllEvents } from '@/lib/mockData'; // We'll need a way to get all events for admin
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

// Client component, dynamic title set via useEffect
// export const metadata: Metadata = {
//   title: 'Manage Events',
//   robots: { index: false, follow: true },
// };

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Events | MyPass.lk Admin';
    }
    const fetchEvents = async () => {
      setIsLoading(true);
      const allEvents = await adminGetAllEvents(); // Using the new admin function
      setEvents(allEvents);
      setIsLoading(false);
    };
    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-headline">Manage Events</h1>
          <p className="text-muted-foreground">View, create, edit, or delete events.</p>
        </div>
        <Button asChild disabled>
          <Link href="/admin/events/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Event (Not Implemented)
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>A list of all events in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No events found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{event.category}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" disabled title="Edit (Not Implemented)">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" disabled title="Delete (Not Implemented)">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
