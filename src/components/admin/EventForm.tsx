
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form"; // Import Controller
import type { EventFormData, EventFormSchema as EventFormSchemaType } from "@/lib/types";
import { EventFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { Event } from "@/lib/types";
import { getEventCategories } from "@/lib/mockData";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Placeholder for a Rich Text Editor component you might create or import
// Example: import MyRichTextEditor from '@/components/shared/MyRichTextEditor';

interface EventFormProps {
  initialData?: Event | null;
  onSubmit: (data: EventFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
}

export default function EventForm({ initialData, onSubmit, isSubmitting, submitButtonText = "Save Event", onCancel }: EventFormProps) {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      setCategories(await getEventCategories());
    };
    fetchCategories();
  }, []);

  const form = useForm<EventFormData>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      slug: initialData.slug,
      date: new Date(initialData.date),
      location: initialData.location,
      description: initialData.description,
      category: initialData.category,
      imageUrl: initialData.imageUrl,
      organizerName: initialData.organizer.name,
      venueName: initialData.venue.name,
      venueAddress: initialData.venue.address || "",
    } : {
      name: "",
      slug: "",
      date: undefined,
      location: "",
      description: "", // Initialize description as empty string
      category: "",
      imageUrl: "",
      organizerName: "",
      venueName: "",
      venueAddress: "",
    },
  });
  
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        slug: initialData.slug,
        date: new Date(initialData.date),
        location: initialData.location,
        description: initialData.description,
        category: initialData.category,
        imageUrl: initialData.imageUrl,
        organizerName: initialData.organizer.name,
        venueName: initialData.venue.name,
        venueAddress: initialData.venue.address || "",
      });
    } else {
      form.reset({ 
        name: "",
        slug: "",
        date: undefined,
        location: "",
        description: "",
        category: "",
        imageUrl: "",
        organizerName: "",
        venueName: "",
        venueAddress: "",
      });
    }
  }, [initialData, form]);


  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'name' && type === 'change' && !form.getValues('slug')) {
        const newSlug = (value.name || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-') 
          .replace(/[^\w-]+/g, '') 
          .replace(/--+/g, '-'); 
        form.setValue('slug', newSlug, { shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual Tech Summit" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Slug</FormLabel>
              <FormControl>
                <Input placeholder="e.g., annual-tech-summit" {...field} />
              </FormControl>
              <FormDescription>
                Unique identifier for the event URL. Auto-generated if left empty.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Event Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., City Conference Center" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 
          RICH TEXT EDITOR INTEGRATION POINT:
          To integrate a rich text editor (e.g., Tiptap, Quill, Slate):
          1. Install the chosen library (e.g., `npm install @tiptap/react @tiptap/starter-kit`).
          2. Create a custom RichTextEditor component that encapsulates the editor's setup and toolbar.
          3. Replace the `Textarea` below with your `MyRichTextEditor` component.
          4. Use react-hook-form's `Controller` component to manage the editor's state.
             The `value` would be HTML string, and `onChange` would come from the editor.
        */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                {/* 
                  Replace this Textarea with your Rich Text Editor component.
                  Example using react-hook-form Controller:
                  
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field: { onChange, value } }) => (
                      <MyRichTextEditor
                        content={value}
                        onChange={onChange} // Your editor's onChange would provide HTML
                      />
                    )}
                  />
                */}
                <Textarea 
                  placeholder="Detailed description of the event... (HTML can be entered here and will be rendered)" 
                  className="min-h-[150px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                You can use basic HTML tags for formatting. For a full rich text editor experience, further integration is needed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                   <SelectItem value="Other">Other (Type below if not listed)</SelectItem>
                </SelectContent>
              </Select>
               {form.watch("category") === "Other" && (
                 <Input 
                    placeholder="Enter custom category" 
                    onChange={(e) => field.onChange(e.target.value)} 
                    value={field.value === "Other" ? "" : (categories.includes(field.value) ? "" : field.value)}
                    className="mt-2"
                 />
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/image.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., EventCorp LLC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Grand Hall" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="venueAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Address (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Main St, Anytown" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}
