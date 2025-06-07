
"use client";

import { useState, useEffect } from "react";
import EventForm from "@/components/admin/EventForm";
import type { EventFormData } from "@/lib/types";
import { createEvent } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Metadata } from 'next';

// Client component, dynamic title set via useEffect
// export const metadata: Metadata = {
//   title: 'Create New Event',
//   robots: { index: false, follow: true },
// };

export default function NewEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Create New Event | MyPass.lk Admin';
    }
  }, []);

  const handleCreateEvent = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const newEvent = await createEvent(data);
      toast({
        title: "Event Created",
        description: `"${newEvent.name}" has been successfully created.`,
      });
      router.push("/admin/events");
      router.refresh(); // Refresh server components if any depend on this data
    } catch (error) {
      console.error("Failed to create event:", error);
      toast({
        title: "Error Creating Event",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-headline">Create New Event</h1>
        <p className="text-muted-foreground">Fill in the details for the new event.</p>
      </div>
      <EventForm onSubmit={handleCreateEvent} isSubmitting={isSubmitting} submitButtonText="Create Event" />
    </div>
  );
}
