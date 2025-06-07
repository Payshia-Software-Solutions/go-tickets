
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import type { EventFormData, Organizer, TicketTypeFormData } from "@/lib/types";
import { EventFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ImageUp, Sparkles, AlertTriangle, PlusCircle, Trash2, Ticket } from "lucide-react";
import type { Event } from "@/lib/types";
import { useEffect, useState, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from '@/components/shared/RichTextEditor';
import { useToast } from "@/hooks/use-toast";
import { generateEventImage } from "@/ai/flows/generate-event-image-flow";
import { suggestImageKeywords } from "@/ai/flows/suggest-image-keywords-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

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
  const { toast } = useToast();

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      ticketTypes: initialData.ticketTypes.map(tt => ({
        id: tt.id,
        name: tt.name,
        price: tt.price,
        availability: tt.availability,
        description: tt.description || "",
      })) || [],
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
      ticketTypes: [{ name: "General Admission", price: 0, availability: 100, description: "" }],
    },
  });

  const { fields: ticketTypeFields, append: appendTicketType, remove: removeTicketType } = useFieldArray({
    control: form.control,
    name: "ticketTypes"
  });
  
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const catResponse = await fetch(`${API_BASE_URL}/events/categories`);
        if (!catResponse.ok) throw new Error('Failed to fetch categories');
        const catData = await catResponse.json();
        setCategories(catData);

        const orgResponse = await fetch(`${API_BASE_URL}/admin/organizers`);
        if (!orgResponse.ok) throw new Error('Failed to fetch organizers');
        const orgData = await orgResponse.json();
        setOrganizers(orgData);
      } catch (error) {
        console.error("Error fetching form dropdown data:", error);
        toast({ title: "Error", description: "Could not load necessary data for the form.", variant: "destructive" });
      }
    };
    fetchDropdownData();
  }, [toast]);
  
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
        ticketTypes: initialData.ticketTypes.map(tt => ({
          id: tt.id,
          name: tt.name,
          price: tt.price,
          availability: tt.availability,
          description: tt.description || "",
        })),
      });
      setSlugManuallyEdited(!!initialData.slug);
      setLocalImagePreview(initialData.imageUrl);
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
        ticketTypes: [{ name: "General Admission", price: 0, availability: 100, description: "" }],
      });
      setSlugManuallyEdited(false);
      setLocalImagePreview(null);
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
              shouldDirty: form.formState.dirtyFields.slug 
          });
        }
      }
      if (name === 'imageUrl') {
          if (typeof value.imageUrl === 'string' && !value.imageUrl?.startsWith('data:image')) {
            setLocalImagePreview(value.imageUrl || null);
          } else if (!value.imageUrl) {
            setLocalImagePreview(null);
          }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, slugManuallyEdited]);

  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit(data);
  };

  const currentImageUrlFieldValue = form.watch("imageUrl");

  const handleAiImageAndKeywords = async () => {
    const eventName = form.getValues("name");
    const eventDescription = form.getValues("description");

    if (!eventName) {
      toast({
        title: "Event Name Required",
        description: "Please enter an event name to generate an image and keywords.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImage(true);
    setIsSuggestingKeywords(true);
    setSuggestedKeywords([]);
    toast({ title: "🤖 AI Magic in Progress...", description: "Generating image and suggesting keywords." });

    try {
      const imageResult = await generateEventImage({ prompt: `${eventName}${eventDescription ? ` - ${eventDescription.substring(0,100)}...` : ''}` });
      if (imageResult.imageUrl) {
        form.setValue("imageUrl", imageResult.imageUrl, { shouldValidate: true, shouldDirty: true });
        setLocalImagePreview(imageResult.imageUrl);
        toast({ title: "🖼️ AI Image Generated!", description: "Image URL has been updated." });
      } else {
        throw new Error("AI did not return an image.");
      }
    } catch (error) {
      console.error("AI Image Generation Error:", error);
      toast({ title: "🚨 AI Image Error", description: "Could not generate image. Please try again or provide a URL manually.", variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }

    try {
      const keywordsResult = await suggestImageKeywords({ eventName, eventDescription });
      if (keywordsResult.keywords && keywordsResult.keywords.length > 0) {
        setSuggestedKeywords(keywordsResult.keywords);
        toast({ title: "💡 Keywords Suggested!", description: "Found some keywords for Unsplash search." });
      } else {
        setSuggestedKeywords([eventName.toLowerCase().replace(/\s+/g, ' ').trim()]);
      }
    } catch (error) {
      console.error("AI Keyword Suggestion Error:", error);
      toast({ title: "🚨 AI Keyword Error", description: "Could not suggest keywords.", variant: "destructive" });
       setSuggestedKeywords([eventName.toLowerCase().replace(/\s+/g, ' ').trim()]);
    } finally {
      setIsSuggestingKeywords(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (e.g., PNG, JPG, GIF).",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setLocalImagePreview(dataUri);
        form.setValue("imageUrl", dataUri, { shouldValidate: true, shouldDirty: true });
      };
      reader.readAsDataURL(file);
    } else {
      // If file input is cleared, but there was a data URI, clear it from form.
      // If it was a regular URL, keep it.
      if (form.getValues("imageUrl")?.startsWith("data:image")) {
          form.setValue("imageUrl", "", { shouldValidate: true, shouldDirty: true });
          setLocalImagePreview(null);
      } else {
          // If it was a non-data URI (e.g. manually pasted URL or previous AI gen), keep it.
          setLocalImagePreview(form.getValues("imageUrl") || null);
      }
       if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Ensure file input field is visually cleared
       }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Basic Event Info */}
        <section className="space-y-6 p-1">
            <h3 className="text-lg font-medium border-b pb-2">Event Details</h3>
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
            render={({ field }) => ( // field.value is the string URL or data URI
                <FormItem>
                <FormLabel>Event Image</FormLabel>
                <div className="space-y-3">
                    <FormControl>
                    {/* Input for file selection */}
                    <Input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange} // This sets localImagePreview and form.setValue("imageUrl", dataUri)
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary/10 file:text-primary
                        hover:file:bg-primary/20"
                    />
                    </FormControl>
                    <FormDescription className="text-xs">
                    Select local image, or use AI generation, or paste a URL.
                    </FormDescription>

                    {/* Input for URL for manual paste / AI Gen */}
                    <Input 
                        placeholder="Or paste image URL here / Use AI Gen"
                        value={field.value?.startsWith("data:image/") ? "(Local image selected or AI generated)" : field.value || ""}
                        onChange={(e) => {
                            field.onChange(e.target.value);
                            setLocalImagePreview(e.target.value);
                            if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input if URL is typed
                        }}
                        disabled={field.value?.startsWith("data:image/")} // Disable if local/AI image is set
                    />


                    <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-700">
                    <AlertTriangle className="h-4 w-4 !text-amber-600" />
                    <AlertTitle className="text-amber-700">Important: Image Handling</AlertTitle>
                    <AlertDescription>
                        If using a local image, it's for preview. Production apps need to upload files to cloud storage and use the returned URL.
                        AI-generated images are data URIs, which are large and also best uploaded for production.
                    </AlertDescription>
                    </Alert>

                    {(localImagePreview || currentImageUrlFieldValue) && (
                    <div className="mt-2 relative w-full aspect-video max-w-sm border rounded-md overflow-hidden bg-muted">
                        <Image
                        src={localImagePreview || currentImageUrlFieldValue!}
                        alt="Event image preview"
                        fill
                        style={{ objectFit: 'contain' }}
                        data-ai-hint="event poster"
                        onError={() => {
                            // If URL is invalid and causes an error, clear preview
                            // setLocalImagePreview(null);
                        }}
                        />
                    </div>
                    )}
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <div className="space-y-2">
                <Button type="button" variant="outline" onClick={handleAiImageAndKeywords} disabled={isGeneratingImage || isSuggestingKeywords} className="w-full sm:w-auto">
                    {(isGeneratingImage || isSuggestingKeywords) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Sparkles className="mr-2 h-4 w-4" /> Get AI Image & Keywords
                </Button>
                {suggestedKeywords.length > 0 && (
                    <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-1">Unsplash keyword suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                        {suggestedKeywords.map(keyword => (
                            <Button key={keyword} variant="outline" size="sm" asChild>
                            <a href={`https://unsplash.com/s/photos/${encodeURIComponent(keyword)}`} target="_blank" rel="noopener noreferrer">
                                {keyword}
                            </a>
                            </Button>
                        ))}
                        </div>
                    </div>
                )}
            </div>
            
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
        </section>

        {/* Ticket Types Section */}
        <section className="space-y-4 p-1">
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-medium flex items-center"><Ticket className="mr-2 h-5 w-5" /> Ticket Types</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendTicketType({ name: "", price: 0, availability: 0, description: "" })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket Type
                </Button>
            </div>

            {ticketTypeFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-muted/20">
                <FormField
                control={form.control}
                name={`ticketTypes.${index}.name`}
                render={({ field: rhfField }) => (
                    <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., General Admission, VIP" {...rhfField} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name={`ticketTypes.${index}.price`}
                    render={({ field: rhfField }) => (
                    <FormItem>
                        <FormLabel>Price (LKR)</FormLabel>
                        <FormControl>
                        <Input 
                            type="number" 
                            placeholder="e.g., 50.00" 
                            {...rhfField}
                            onChange={e => rhfField.onChange(parseFloat(e.target.value) || 0)}
                         />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`ticketTypes.${index}.availability`}
                    render={({ field: rhfField }) => (
                    <FormItem>
                        <FormLabel>Availability</FormLabel>
                        <FormControl>
                        <Input 
                            type="number" 
                            placeholder="e.g., 100" 
                            {...rhfField} 
                            onChange={e => rhfField.onChange(parseInt(e.target.value, 10) || 0)}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                <FormField
                control={form.control}
                name={`ticketTypes.${index}.description`}
                render={({ field: rhfField }) => (
                    <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g., Includes backstage pass" {...rhfField} rows={2} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {ticketTypeFields.length > 1 && (
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeTicketType(index)}
                        className="absolute top-2 right-2"
                        title="Remove Ticket Type"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            ))}
            {form.formState.errors.ticketTypes && !form.formState.errors.ticketTypes.root && ( // Show root array errors
                <p className="text-sm font-medium text-destructive">{form.formState.errors.ticketTypes.message}</p>
            )}
             {form.formState.errors.ticketTypes?.root && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.ticketTypes.root.message}</p>
            )}

        </section>
        
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
