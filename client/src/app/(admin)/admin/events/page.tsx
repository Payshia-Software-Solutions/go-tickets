
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Event, EventFormData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, Star, Zap, Sparkles } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import EventForm from '@/components/admin/EventForm';
import EventDetailsManager from '@/components/admin/EventDetailsManager';
import { getAdminEventById, deleteEvent, createEvent, updateEvent, adminGetAllEvents, toggleAcceptBooking, setFeaturedEvent } from '@/lib/mockData';

const API_PROXY_URL = '/api/admin/events';


export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booking toggle in-flight state
  const [togglingBookingId, setTogglingBookingId] = useState<string | null>(null);

  // Featured Banner Modal state
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [eventForFeatured, setEventForFeatured] = useState<Event | null>(null);
  const [isFeaturedActive, setIsFeaturedActive] = useState(false);
  const [featuredBadge, setFeaturedBadge] = useState("");
  const [featuredDescription, setFeaturedDescription] = useState("");
  const [isSavingFeatured, setIsSavingFeatured] = useState(false);

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

  const handleToggleAcceptBooking = async (event: Event) => {
    const currentStatus = String(event.accept_booking) === '1' ? 1 : 0;
    const nextStatus = currentStatus === 1 ? 0 : 1;

    // Optimistic UI update
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, accept_booking: nextStatus } : e));
    setTogglingBookingId(event.id);

    try {
      await toggleAcceptBooking(event.id, nextStatus);
      toast({
        title: nextStatus === 1 ? "Bookings Opened" : "Bookings Closed",
        description: `Bookings for "${event.name}" are now ${nextStatus === 1 ? 'OPEN' : 'CLOSED'}.`,
      });
    } catch (error) {
      // Revert on error
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, accept_booking: currentStatus } : e));
      toast({
        title: "Error Updating Booking Status",
        description: error instanceof Error ? error.message : "Failed to update booking status.",
        variant: "destructive",
      });
    } finally {
      setTogglingBookingId(null);
    }
  };

  const handleOpenFeaturedModal = (event: Event) => {
    setEventForFeatured(event);
    setIsFeaturedActive(Number(event.is_featured) === 1);
    setFeaturedBadge(event.featured_badge || "80% Sold Out!");
    setFeaturedDescription(event.featured_description || "");
    setShowFeaturedModal(true);
  };

  const handleDisableFeatured = async (event: Event) => {
    setIsSubmitting(true);
    try {
      await setFeaturedEvent(event.id, false);
      toast({
        title: "Featured Banner Removed",
        description: `"${event.name}" will no longer appear as the homepage popup banner.`,
      });
      fetchEvents();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove featured banner.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFeaturedSettings = async () => {
    if (!eventForFeatured) return;
    setIsSavingFeatured(true);
    try {
      await setFeaturedEvent(
        eventForFeatured.id,
        isFeaturedActive,
        isFeaturedActive ? (featuredBadge.trim() || "Tickets Selling Fast!") : "",
        isFeaturedActive ? featuredDescription.trim() : ""
      );
      toast({
        title: isFeaturedActive ? "Homepage Banner Activated" : "Homepage Banner Deactivated",
        description: isFeaturedActive
          ? `"${eventForFeatured.name}" is now featured on the homepage popup!`
          : `Homepage popup banner turned off for "${eventForFeatured.name}".`,
      });
      setShowFeaturedModal(false);
      setEventForFeatured(null);
      fetchEvents();
    } catch (error) {
      toast({
        title: "Error Saving Banner Settings",
        description: error instanceof Error ? error.message : "Failed to update featured banner settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingFeatured(false);
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

  const currentFeaturedEvent = events.find(e => Number(e.is_featured) === 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-headline">Manage Events</h1>
          <p className="text-muted-foreground">View, create, edit, manage bookings, and set homepage featured banner.</p>
        </div>
        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
        </Button>
      </div>

      {/* Featured Banner Status Card */}
      {currentFeaturedEvent ? (
        <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-card dark:from-amber-950/20 dark:to-card">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
                <Star className="h-5 w-5 fill-amber-400 text-amber-500 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Homepage Entrance Banner (Active)</span>
                  <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] font-bold">
                    <Zap className="h-2.5 w-2.5 mr-1 animate-pulse" />
                    {currentFeaturedEvent.featured_badge || "Tickets Selling Fast!"}
                  </Badge>
                </div>
                <h3 className="font-bold text-base text-foreground mt-0.5">{currentFeaturedEvent.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {currentFeaturedEvent.featured_description
                    ? `Message: "${currentFeaturedEvent.featured_description}"`
                    : "This event pops up automatically in a banner when visitors arrive on the homepage."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenFeaturedModal(currentFeaturedEvent)}
                className="flex-1 sm:flex-initial text-xs border-amber-300 dark:border-amber-800 hover:bg-amber-100/60"
              >
                Customize Banner
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisableFeatured(currentFeaturedEvent)}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                Turn Off
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>No event is currently set as the Homepage Entrance Banner. Click <strong>Feature</strong> on any event below to enable it.</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>A list of all events in the system. Use the toggles to manage bookings and homepage banner.</CardDescription>
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
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Bookings</TableHead>
                    <TableHead className="text-center">Homepage Banner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const isBookable = String(event.accept_booking) === '1';
                    const isFeatured = Number(event.is_featured) === 1;

                    return (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{event.name}</span>
                            {isFeatured && (
                              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300 text-[10px] gap-1 px-1.5 py-0">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                                Banner
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(event.date).toLocaleDateString()}</TableCell>
                        <TableCell className="whitespace-nowrap">{event.venueName || event.location}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className="font-normal text-xs">{event.category}</Badge>
                        </TableCell>

                        {/* Quick Toggle: Accept Booking */}
                        <TableCell className="text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-2">
                            <Switch
                              checked={isBookable}
                              onCheckedChange={() => handleToggleAcceptBooking(event)}
                              disabled={togglingBookingId === event.id}
                              title={isBookable ? "Click to Close Bookings" : "Click to Open Bookings"}
                            />
                            <span className={`text-xs font-semibold ${isBookable ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                              {isBookable ? "Open" : "Closed"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Quick Toggle: Featured Banner */}
                        <TableCell className="text-center whitespace-nowrap">
                          {isFeatured ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenFeaturedModal(event)}
                              className="bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-100/60 font-semibold gap-1.5 h-8 text-xs rounded-full shadow-xs"
                              title="Click to customize homepage banner text"
                            >
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 animate-pulse" />
                              <span>{event.featured_badge || "Featured"}</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenFeaturedModal(event)}
                              className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1 h-8 text-xs rounded-full"
                              title="Set this event as homepage banner"
                            >
                              <Star className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Feature</span>
                            </Button>
                          )}
                        </TableCell>

                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(event)} title="Edit Event" disabled={isLoading}>
                            {isLoading && currentEventForEdit?.id === event.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit className="h-4 w-4" />}
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(event)} title="Delete Event">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* Featured Banner Settings Dialog */}
      <Dialog open={showFeaturedModal} onOpenChange={setShowFeaturedModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
              Homepage Popup Banner Settings
            </DialogTitle>
            <DialogDescription>
              Control the popup banner that greets visitors when they first arrive at the website.
            </DialogDescription>
          </DialogHeader>

          {eventForFeatured && (
            <div className="space-y-4 py-2">
              {/* Event preview header */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Selected Event</div>
                  <div className="font-bold text-sm text-foreground truncate">{eventForFeatured.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(eventForFeatured.date).toLocaleDateString()} &bull; {eventForFeatured.venueName || eventForFeatured.location}</div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-card border rounded-xl shadow-xs">
                <div>
                  <div className="font-semibold text-sm">Feature on Homepage Popup</div>
                  <div className="text-xs text-muted-foreground">Show this event in the entrance popup modal</div>
                </div>
                <Switch
                  checked={isFeaturedActive}
                  onCheckedChange={setIsFeaturedActive}
                />
              </div>

              {isFeaturedActive && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  {/* Badge Text Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Urgency Badge Text</span>
                      <span className="text-[11px] text-muted-foreground font-normal">Shown in glowing red badge</span>
                    </label>
                    <Input
                      value={featuredBadge}
                      onChange={(e) => setFeaturedBadge(e.target.value)}
                      placeholder="e.g. 80% Sold Out!, 50% Sold, Early Bird..."
                      className="font-medium"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-muted-foreground mr-0.5">Quick presets:</span>
                      {["80% Sold Out!", "50% Sold", "Tickets Selling Fast!", "Early Bird Offer!", "Limited Tickets!"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFeaturedBadge(preset)}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtitle / Description Textarea */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Custom Subtitle / Message (Optional)</label>
                    <Textarea
                      rows={2}
                      value={featuredDescription}
                      onChange={(e) => setFeaturedDescription(e.target.value)}
                      placeholder="e.g. Hurry up! Grab your tickets before they're gone."
                      className="text-sm resize-none"
                    />
                  </div>

                  {/* Live Banner Preview Box */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5 border border-slate-800 shadow-inner">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Popup Live Preview</div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        <Zap className="h-2.5 w-2.5 animate-pulse" />
                        {featuredBadge || "Tickets Selling Fast!"}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-white truncate">{eventForFeatured.name}</div>
                    <div className="text-xs text-slate-300">
                      {featuredDescription || "Don't miss out on one of the hottest events of the year. Grab your tickets before they're all gone."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t mt-2">
            <Button variant="outline" onClick={() => setShowFeaturedModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFeaturedSettings} disabled={isSavingFeatured}>
              {isSavingFeatured && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
