
"use client";

import { useEffect, useState } from 'react';
import type { Event } from '@/lib/types';
import { adminGetAllEvents, deleteEvent } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { Metadata } from 'next';

// Client component, dynamic title set via useEffect
// export const metadata: Metadata = {
//   title: 'Manage Events',
//   robots: { index: false, follow: true },
// };

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Events | MyPass.lk Admin';
    }
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    const allEvents = await adminGetAllEvents();
    setEvents(allEvents);
    setIsLoading(false);
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsLoading(true); // Can use a more specific loading state if needed
    const success = await deleteEvent(eventToDelete.id);
    if (success) {
      toast({
        title: "Event Deleted",
        description: `"${eventToDelete.name}" has been successfully deleted.`,
      });
      fetchEvents(); // Re-fetch events to update the list
    } else {
      toast({
        title: "Error Deleting Event",
        description: "Could not delete the event. It might have already been removed or an error occurred.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    setShowDeleteDialog(false);
    setEventToDelete(null);
    // setIsLoading(false) will be called by fetchEvents if successful
  };

  if (isLoading && events.length === 0) { // Show initial loading spinner only if no events are yet loaded
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
        <Button asChild>
          <Link href="/admin/events/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>A list of all events in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && events.length > 0 && ( // Show a smaller loading indicator when refreshing
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">Refreshing events...</p>
            </div>
          )}
          {!isLoading && events.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No events found. Start by adding a new event.</p>
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
                      <Button variant="outline" size="icon" asChild title="Edit Event">
                        <Link href={`/admin/events/edit/${event.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(event)} title="Delete Event">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event
              <span className="font-semibold"> {eventToDelete?.name}</span> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
