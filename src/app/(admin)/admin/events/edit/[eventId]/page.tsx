
"use client";

import { useState, useEffect } from "react";
import EventForm from "@/components/admin/EventForm";
import type { EventFormData } from "@/lib/types";
import { getEventById, updateEvent } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface EditEventPageProps {
  params: { eventId: string };
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { eventId } = params;

  useEffect(() => {
    if (typeof window !== 'undefined' && event) {
      document.title = `Edit: ${event.name} | MyPass.lk Admin`;
    } else if (typeof window !== 'undefined') {
        document.title = 'Edit Event | MyPass.lk Admin';
    }
  }, [event]);

  useEffect(() => {
    const fetchEvent = async () => {
      setIsLoading(true);
      const fetchedEvent = await getEventById(eventId);
      if (fetchedEvent) {
        setEvent(fetchedEvent);
      } else {
        toast({
          title: "Event Not Found",
          description: "The event you are trying to edit does not exist.",
          variant: "destructive",
        });
        router.replace("/admin/events"); // Correctly points to admin events list
      }
      setIsLoading(false);
    };
    if (eventId) { // Ensure eventId is present before fetching
        fetchEvent();
    } else {
        toast({
          title: "Invalid Event ID",
          description: "Cannot load event details without a valid ID.",
          variant: "destructive",
        });
        router.replace("/admin/events");
        setIsLoading(false);
    }
  }, [eventId, router, toast]);

  const handleUpdateEvent = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const updatedEvent = await updateEvent(eventId, data);
      if (updatedEvent) {
        toast({
          title: "Event Updated",
          description: `"${updatedEvent.name}" has been successfully updated.`,
        });
        router.push("/admin/events"); // Correctly points to admin events list
        router.refresh(); 
      } else {
         toast({
          title: "Error Updating Event",
          description: "Could not find the event to update.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update event:", error);
      toast({
        title: "Error Updating Event",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-10">Event not found or error loading details.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-headline">Edit Event: {event.name}</h1>
        <p className="text-muted-foreground">Modify the details for this event.</p>
      </div>
      <EventForm
        initialData={event}
        onSubmit={handleUpdateEvent}
        isSubmitting={isSubmitting}
        submitButtonText="Update Event"
      />
    </div>
  );
}
