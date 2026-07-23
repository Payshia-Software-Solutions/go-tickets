
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { OrganizerFormData } from "@/lib/types";
import { OrganizerFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Organizer } from "@/lib/types";
import { useEffect } from "react";

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'; // This will be passed by the page

interface OrganizerFormProps {
  initialData?: Organizer | null;
  onSubmit: (data: OrganizerFormData) => Promise<void>; // Prop called by parent page after API interaction
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
}

export default function OrganizerForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText = "Save Organizer",
  onCancel,
}: OrganizerFormProps) {
  const form = useForm<OrganizerFormData>({
    resolver: zodResolver(OrganizerFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      contactEmail: initialData.contactEmail,
      website: initialData.website || "",
    } : {
      name: "",
      contactEmail: "",
      website: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        contactEmail: initialData.contactEmail,
        website: initialData.website || "",
      });
    } else {
      form.reset({
        name: "",
        contactEmail: "",
        website: "",
      });
    }
  }, [initialData, form]);

  const handleFormSubmit = async (data: OrganizerFormData) => {
    await onSubmit(data); // Parent page handles API call
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Awesome Events LLC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., contact@awesomeevents.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="e.g., https://awesomeevents.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-2 justify-end pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
