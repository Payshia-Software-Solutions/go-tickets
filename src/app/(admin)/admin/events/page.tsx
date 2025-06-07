
"use client";

import { useEffect, useState } from 'react';
import type { Event, EventFormData } from '@/lib/types';
// Removed direct imports: adminGetAllEvents, deleteEvent, createEvent, updateEvent
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react';
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
import EventForm from '@/components/admin/EventForm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEventForEdit, setCurrentEventForEdit] = useState<Event | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Events | Event Horizon Admin';
    }
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const allEvents: Event[] = await response.json();
      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error Fetching Events",
        description: "Could not load events from the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsLoading(true); // Or a specific delete loading state
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events/${eventToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete event and parse error' }));
        throw new Error(errorData.message || 'Failed to delete event');
      }
      toast({
        title: "Event Deleted",
        description: \`"\${eventToDelete.name}" has been successfully deleted.\`,
      });
      fetchEvents(); // Re-fetch events
    } catch (error: any) {
      toast({
        title: "Error Deleting Event",
        description: error.message || "Could not delete the event.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    setShowDeleteDialog(false);
    setEventToDelete(null);
  };

  const handleOpenCreateModal = () => {
    setCurrentEventForEdit(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = async (event: Event) => {
    // Fetch the full event data in case list view is partial
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events/${event.id}`);
      if (!response.ok) throw new Error('Failed to fetch event details');
      const fullEventData = await response.json();
      setCurrentEventForEdit(fullEventData);
      setShowEditModal(true);
    } catch (error) {
      toast({ title: "Error", description: "Could not load event details for editing.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEventSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create event and parse error' }));
        throw new Error(errorData.message || 'Failed to create event');
      }
      const newEvent = await response.json();
      toast({
        title: "Event Created",
        description: \`"\${newEvent.name}" has been successfully created.\`,
      });
      setShowCreateModal(false);
      fetchEvents();
    } catch (error: any) {
      console.error("Failed to create event:", error);
      toast({
        title: "Error Creating Event",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEventSubmit = async (data: EventFormData) => {
    if (!currentEventForEdit) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/events/${currentEventForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update event and parse error' }));
        throw new Error(errorData.message || 'Failed to update event');
      }
      const updatedEvent = await response.json();
      toast({
        title: "Event Updated",
        description: \`"\${updatedEvent.name}" has been successfully updated.\`,
      });
      setShowEditModal(false);
      setCurrentEventForEdit(null);
      fetchEvents();
    } catch (error: any) {
      console.error("Failed to update event:", error);
      toast({
        title: "Error Updating Event",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">Manage Events</h1>
          <p className="text-muted-foreground">View, create, edit, or delete events.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>A list of all events in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && events.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">Refreshing events...</p>
            </div>
          )}
          {!isLoading && events.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No events found. Start by adding a new event.</p>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="font-medium whitespace-nowrap">{event.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(event.date).toLocaleDateString()}</TableCell>
                      <TableCell className="whitespace-nowrap">{event.location}</TableCell>
                      <TableCell className="whitespace-nowrap">{event.category}</TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(event)} title="Edit Event">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(event)} title="Delete Event">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Fill in the details for the new event.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            <EventForm
              onSubmit={handleCreateEventSubmit}
              isSubmitting={isSubmitting}
              submitButtonText="Create Event"
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {currentEventForEdit && (
        <Dialog open={showEditModal} onOpenChange={(isOpen) => {
            setShowEditModal(isOpen);
            if (!isOpen) setCurrentEventForEdit(null);
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event: {currentEventForEdit.name}</DialogTitle>
              <DialogDescription>Modify the details for this event.</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
              <EventForm
                initialData={currentEventForEdit}
                onSubmit={handleUpdateEventSubmit}
                isSubmitting={isSubmitting}
                submitButtonText="Update Event"
                onCancel={() => {
                    setShowEditModal(false);
                    setCurrentEventForEdit(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
