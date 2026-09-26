
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Event, EventFormData } from '@/lib/types';
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
import EventDetailsManager from '@/components/admin/EventDetailsManager';
import { getAdminEventById, deleteEvent, createEvent, updateEvent, adminGetAllEvents } from '@/lib/mockData';

const API_PROXY_URL = '/api/admin/events';


export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationStep, setCreationStep] = useState<'create' | 'addDetails'>('create');
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEventForEdit, setCurrentEventForEdit] = useState<Event | null>(null);

  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents: Event[] = await adminGetAllEvents();
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
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Manage Events | Event Horizon Admin';
    }
    fetchEvents();
  }, [fetchEvents]);

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteEvent(eventToDelete.id);
      toast({
        title: "Event Deleted",
        description: `"${eventToDelete.name}" has been successfully deleted.`,
      });
      fetchEvents();
    } catch (error: unknown) {
      toast({
        title: "Error Deleting Event",
        description: (error instanceof Error ? error.message : "Could not delete the event."),
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
        setShowDeleteDialog(false);
        setEventToDelete(null);
    }
  };

  const resetCreationFlow = () => {
    setCreationStep('create');
    setCreatedEventId(null);
    setShowCreateModal(false);
  };

  const handleOpenCreateModal = () => {
    resetCreationFlow();
    setShowCreateModal(true);
  };

  const handleCreateEventSubmit = async (data: EventFormData, imageFile: File | null) => {
    setIsSubmitting(true);
    try {
      const newEventId = await createEvent(data, imageFile);
      
      toast({
        title: "Step 1 Complete: Event Created!",
        description: `Event "${data.name}" has been created. Now add ticket types and showtimes.`,
      });
      setCreatedEventId(newEventId);
      setCreationStep('addDetails');
    } catch (error: unknown) {
      console.error("Failed to create event:", error);
      toast({
        title: "Error Creating Event",
        description: (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFinishCreation = () => {
    resetCreationFlow();
    fetchEvents();
  };

  const handleOpenEditModal = async (event: Event) => {
    setIsLoading(true);
    try {
      const fullEventData = await getAdminEventById(event.id);
      if (!fullEventData) {
        throw new Error('Event details could not be loaded. It may have been deleted.');
      }
      setCurrentEventForEdit(fullEventData);
      setShowEditModal(true);
    } catch (error: unknown) {
      console.error("Error fetching event details for edit:", error);
      toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not load event details for editing.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEventSubmit = async (data: EventFormData, imageFile: File | null) => {
    if (!currentEventForEdit) return;
    setIsSubmitting(true);
    try {
      await updateEvent(currentEventForEdit.id, data, currentEventForEdit, imageFile);
      
      toast({
        title: "Event Updated",
        description: `Your changes to "${data.name}" have been saved successfully.`,
      });
      setShowEditModal(false);
      setCurrentEventForEdit(null);
      fetchEvents(); // Refresh the list
    } catch (error: unknown) {
      console.error("Failed to update event:", error);
      toast({
        title: "Error Updating Event",
        description: (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
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
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(event)} title="Edit Event" disabled={isLoading}>
                          {isLoading && currentEventForEdit?.id === event.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit className="h-4 w-4" />}
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
      
      {/* Create Event Dialog (Two-Step Flow) */}
      <Dialog open={showCreateModal} onOpenChange={(isOpen) => { if (!isOpen) resetCreationFlow(); else setShowCreateModal(true); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{creationStep === 'create' ? 'Create New Event (Step 1 of 2)' : 'Add Details (Step 2 of 2)'}</DialogTitle>
            <DialogDescription>{creationStep === 'create' ? 'Fill in the core details for the new event.' : 'Now, add ticket types and showtimes for the event.'}</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[80vh] overflow-y-auto pr-4">
            {creationStep === 'create' && (
              <EventForm
                onSubmit={handleCreateEventSubmit}
                isSubmitting={isSubmitting}
                submitButtonText="Save & Continue"
                onCancel={resetCreationFlow}
              />
            )}
            {creationStep === 'addDetails' && createdEventId && (
              <EventDetailsManager
                eventId={createdEventId}
                onFinished={handleFinishCreation}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Event Dialog (Full form with tabs) */}
      {currentEventForEdit && (
        <Dialog open={showEditModal} onOpenChange={(isOpen) => {
            setShowEditModal(isOpen);
            if (!isOpen) setCurrentEventForEdit(null);
        }}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Event: {currentEventForEdit.name}</DialogTitle>
              <DialogDescription>Modify all details for this event.</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[80vh] overflow-y-auto pr-4">
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
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
