
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { EventFormData, Organizer } from "@/lib/types";
import { EventFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Sparkles, ExternalLink } from "lucide-react";
import type { Event } from "@/lib/types";
import { getEventCategories, adminGetAllOrganizers } from "@/lib/mockData";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from '@/components/shared/RichTextEditor';
import { generateEventImage } from '@/ai/flows/generate-event-image-flow';
import { suggestImageKeywords } from '@/ai/flows/suggest-image-keywords-flow';
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface EventFormProps {
  initialData?: Event | null;
  onSubmit: (data: EventFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
}

export default function EventForm({ initialData, onSubmit, isSubmitting, submitButtonText = "Save Event", onCancel }: EventFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug);
  const [isGeneratingAiSuggestions, setIsGeneratingAiSuggestions] = useState(false);
  const [aiSuggestedKeywords, setAiSuggestedKeywords] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDropdownData = async () => {
      setCategories(await getEventCategories());
      setOrganizers(await adminGetAllOrganizers());
    };
    fetchDropdownData();
  }, []);

  const form = useForm<EventFormData>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      slug: initialData.slug,
      date: new Date(initialData.date),
      location: initialData.location,
      description: initialData.description || "<p></p>",
      category: initialData.category,
      imageUrl: initialData.imageUrl,
      organizerId: initialData.organizer.id,
      venueName: initialData.venue.name,
      venueAddress: initialData.venue.address || "",
    } : {
      name: "",
      slug: "",
      date: undefined,
      location: "",
      description: "<p></p>",
      category: "",
      imageUrl: "",
      organizerId: "",
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
        description: initialData.description || "<p></p>",
        category: initialData.category,
        imageUrl: initialData.imageUrl,
        organizerId: initialData.organizer.id,
        venueName: initialData.venue.name,
        venueAddress: initialData.venue.address || "",
      });
      setSlugManuallyEdited(!!initialData.slug); 
    } else {
      form.reset({ 
        name: "",
        slug: "",
        date: undefined,
        location: "",
        description: "<p></p>",
        category: "",
        imageUrl: "",
        organizerId: "",
        venueName: "",
        venueAddress: "",
      });
      setSlugManuallyEdited(false);
    }
  }, [initialData, form]);


  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'name' && type === 'change' && !slugManuallyEdited) {
        const nameValue = (value.name || '').trim();
        const newPotentialSlug = nameValue
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-');
        
        if (form.getValues('slug') !== newPotentialSlug) {
          form.setValue('slug', newPotentialSlug, { 
              shouldValidate: true, 
              shouldDirty: form.formState.dirtyFields.slug // Only mark dirty if it was already dirty
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, slugManuallyEdited]);

  const handleAiImageSuggestions = async () => {
    const eventName = form.getValues("name");
    if (!eventName.trim()) {
      toast({
        title: "Cannot Generate Suggestions",
        description: "Please enter an event name first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAiSuggestions(true);
    setAiSuggestedKeywords([]); // Reset previous keywords
    toast({ title: "🤖 AI Working...", description: "Generating image and keywords..." });

    // Extract text from description
    let descriptionText = "";
    const descriptionHtml = form.getValues("description");
    if (descriptionHtml && typeof window !== 'undefined') {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = descriptionHtml;
            descriptionText = tempDiv.textContent || tempDiv.innerText || "";
            descriptionText = descriptionText.replace(/\s+/g, ' ').trim().substring(0, 200); // Limit length
        } catch (e) {
            console.warn("Could not parse description HTML for AI prompt", e);
        }
    }
    
    const imageGenPrompt = `Generate a vibrant and exciting event poster or promotional image for an event titled "${eventName}". ${descriptionText ? `The event is about: "${descriptionText}".` : ''} The image should be suitable for a website. Focus on conveying energy and appeal.`;

    try {
      // Generate Image
      const imagePromise = generateEventImage({ prompt: imageGenPrompt });
      // Suggest Keywords
      const keywordsPromise = suggestImageKeywords({ eventName, eventDescription: descriptionText });

      const [imageResult, keywordsResult] = await Promise.allSettled([imagePromise, keywordsPromise]);

      if (imageResult.status === 'fulfilled' && imageResult.value.imageUrl) {
        form.setValue("imageUrl", imageResult.value.imageUrl, { shouldValidate: true, shouldDirty: true });
        toast({
          title: "AI Image Generated!",
          description: "Image URL has been set.",
        });
      } else {
        toast({
          title: "AI Image Generation Failed",
          description: imageResult.status === 'rejected' ? (imageResult.reason as Error)?.message || "Could not generate image." : "No image URL returned.",
          variant: "destructive",
        });
      }

      if (keywordsResult.status === 'fulfilled' && keywordsResult.value.keywords) {
        setAiSuggestedKeywords(keywordsResult.value.keywords);
        toast({
          title: "AI Keywords Suggested!",
          description: "Check below the image field for Unsplash search links.",
        });
      } else {
         toast({
          title: "AI Keyword Suggestion Failed",
          description: keywordsResult.status === 'rejected' ? (keywordsResult.reason as Error)?.message || "Could not suggest keywords." : "No keywords returned.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("AI Image/Keyword Suggestion Error:", error);
      toast({
        title: "AI Suggestion Failed",
        description: "An unexpected error occurred. Please try again or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAiSuggestions(false);
    }
  };


  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit(data);
  };

  const currentImageUrl = form.watch("imageUrl");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
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
                  <Input 
                    placeholder="e.g., annual-tech-summit" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      setSlugManuallyEdited(true);
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Auto-updates from name if not manually edited. Uniqueness handled on save.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Event Date & Time</FormLabel>
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
                          format(field.value, "PPP HH:mm") 
                        ) : (
                          <span>Pick a date and time</span>
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
                     <div className="p-2 border-t border-border">
                        <Input
                            type="time"
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => {
                                const newTime = e.target.value;
                                const currentDate = field.value || new Date();
                                const [hours, minutes] = newTime.split(':').map(Number);
                                const newDate = new Date(currentDate);
                                newDate.setHours(hours);
                                newDate.setMinutes(minutes);
                                field.onChange(newDate);
                            }}
                            className="w-full"
                        />
                    </div>
                  </PopoverContent>
                </Popover>
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
                {form.watch("category") === "Other" && !categories.includes(field.value) && (
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
        </div>

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
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field: controllerField }) => (
                    <RichTextEditor
                      value={controllerField.value}
                      onChange={controllerField.onChange}
                    />
                  )}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Use the rich text editor to format your event description.
              </FormDescription>
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
              <div className="flex items-start gap-2">
                <FormControl className="flex-grow">
                  <Input type="url" placeholder="https://example.com/image.png or use AI" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAiImageSuggestions}
                  disabled={isGeneratingAiSuggestions || isSubmitting}
                  size="sm"
                  className="shrink-0"
                >
                  {isGeneratingAiSuggestions ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  AI Image & Keywords
                </Button>
              </div>
               {currentImageUrl && (
                <div className="mt-2">
                    <img src={currentImageUrl} alt="Event image preview" className="rounded-md max-h-40 w-auto border" />
                </div>
                )}
              {aiSuggestedKeywords.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Try searching Unsplash for:</p>
                  <ul className="flex flex-wrap gap-2">
                    {aiSuggestedKeywords.map(keyword => (
                      <li key={keyword}>
                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs">
                          <Link href={`https://unsplash.com/s/photos/${encodeURIComponent(keyword)}`} target="_blank" rel="noopener noreferrer">
                            {keyword} <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <FormDescription className="text-xs mt-1">
                Provide an image URL or use AI to generate one and get keyword suggestions for Unsplash.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          <FormField
            control={form.control}
            name="organizerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organizer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an organizer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {organizers.length === 0 && <p className="p-2 text-sm text-muted-foreground">No organizers found. Please add one.</p>}
                    {organizers.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        </div>

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
            {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isGeneratingAiSuggestions}>
                    Cancel
                </Button>
            )}
            <Button type="submit" disabled={isSubmitting || isGeneratingAiSuggestions}>
                {(isSubmitting || isGeneratingAiSuggestions) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}

