
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import type { Organizer, Category, EventFormData, AddShowTimeFormData, TicketTypeFormData } from "@/lib/types";
import { EventFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Sparkles, AlertTriangle, Trash2, PlusCircle, Ticket, Clock } from "lucide-react";
import type { Event } from "@/lib/types";
import { useEffect, useState, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from '@/components/shared/RichTextEditor';
import { useToast } from "@/hooks/use-toast";
import { generateEventImage } from "@/ai/flows/generate-event-image-flow";
import { suggestImageKeywords } from "@/ai/flows/suggest-image-keywords-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { getEventCategories, deleteTicketType, createShowTime, createTicketType } from "@/lib/mockData";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShowTimeForm from "./ShowTimeForm";
import TicketTypeForm from "./TicketTypeForm";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface EventFormProps {
  initialData?: Event | null;
  onSubmit: (data: EventFormData, imageFile: File | null) => Promise<void>; 
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
}

// Helper to convert a data URI to a File object
async function dataUriToFile(dataUri: string, filename: string): Promise<File> {
  const res = await fetch(dataUri);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}


export default function EventForm({ initialData, onSubmit, isSubmitting, submitButtonText = "Save Event", onCancel }: EventFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug);
  const { toast } = useToast();

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<{ id: string | undefined; name: string; index: number } | null>(null);
  const [isDeletingTicketType, setIsDeletingTicketType] = useState(false);
  
  const [isAddShowTimeDialogOpen, setAddShowTimeDialogOpen] = useState(false);
  const [isSubmittingShowTime, setIsSubmittingShowTime] = useState(false);

  const [isAddTicketTypeDialogOpen, setAddTicketTypeDialogOpen] = useState(false);
  const [isSubmittingTicketType, setIsSubmittingTicketType] = useState(false);
  const [currentTargetShowtimeId, setCurrentTargetShowtimeId] = useState<string | null>(null);

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
      organizerId: initialData.organizerId,
      venueName: initialData.venueName,
      venueAddress: initialData.venueAddress || "",
      ticketTypes: initialData.ticketTypes?.map(tt => ({
        id: tt.id,
        name: tt.name,
        price: tt.price,
        availability: tt.availability,
        description: tt.description || '',
      })) || [],
      showTimes: initialData.showTimes?.map(st => ({
        id: st.id,
        dateTime: new Date(st.dateTime),
        ticketAvailabilities: st.ticketAvailabilities.map(sta => ({
          id: sta.id,
          ticketTypeId: sta.ticketType.id,
          ticketTypeName: sta.ticketType.name,
          availableCount: sta.availableCount,
        }))
      })) || [],
    } : {
      name: "",
      slug: "",
      date: new Date(),
      location: "",
      description: "<p></p>",
      category: "",
      imageUrl: "",
      organizerId: "",
      venueName: "",
      venueAddress: "",
      ticketTypes: [],
      showTimes: [],
    },
  });

  const { fields: ticketTypeFields, append: appendTicketType, remove: removeTicketType } = useFieldArray({
    control: form.control,
    name: "ticketTypes"
  });

  const { fields: showTimeFields, append: appendShowTime, remove: removeShowTime, update: updateShowTime } = useFieldArray({
    control: form.control,
    name: "showTimes"
  });

  const watchedTicketTypes = form.watch("ticketTypes");

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const catData = await getEventCategories();
        setCategories(catData);

        const orgResponse = await fetch(`${API_BASE_URL}/organizers`);
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
      if (name === 'imageUrl' && typeof value.imageUrl === 'string' && !value.imageUrl.startsWith('data:image')) {
          setLocalImagePreview(value.imageUrl || null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, slugManuallyEdited]);


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
        const aiFile = await dataUriToFile(imageResult.imageUrl, "ai-generated-image.png");
        setImageFile(aiFile);
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
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setLocalImagePreview(dataUri);
        form.setValue("imageUrl", dataUri, { shouldValidate: true, shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddTicketTypeDialog = (showtimeId: string) => {
    setCurrentTargetShowtimeId(showtimeId);
    setAddTicketTypeDialogOpen(true);
  };
  
  const handleShowTimeDialogSubmit = async (data: AddShowTimeFormData) => {
      if (!initialData?.id) {
        toast({ title: "Cannot Add Showtime", description: "The event must be saved first before adding showtimes.", variant: "destructive" });
        return;
      }
      setIsSubmittingShowTime(true);
      try {
        const newShowTime = await createShowTime(initialData.id, data);

        const newAvailabilities = watchedTicketTypes.map(tt => ({
            ticketTypeId: tt.id || `temp-id-${Math.random()}`,
            ticketTypeName: tt.name,
            availableCount: tt.availability || 0,
        }));
        
        appendShowTime({
            id: newShowTime.id,
            dateTime: new Date(newShowTime.dateTime),
            ticketAvailabilities: newAvailabilities,
        });

        setIsSubmittingShowTime(false);
        setAddShowTimeDialogOpen(false);
        toast({
            title: "Showtime Created",
            description: "The new showtime has been successfully saved.",
        });
        // Open ticket type dialog for the new showtime
        openAddTicketTypeDialog(newShowTime.id);
      } catch (error) {
          toast({
              title: "Error Creating Showtime",
              description: error instanceof Error ? error.message : "An unexpected error occurred.",
              variant: "destructive",
          });
          setIsSubmittingShowTime(false);
      }
  };

  const handleTicketTypeDialogSubmit = async (data: TicketTypeFormData) => {
    if (!initialData?.id || !data.showtimeId) {
        toast({
            title: "Cannot Create Ticket Type",
            description: "A valid event and showtime must be selected.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmittingTicketType(true);
    try {
        const newTicketType = await createTicketType(initialData.id, data);
        
        const showtimeIndex = showTimeFields.findIndex(st => st.id === data.showtimeId);
        if (showtimeIndex !== -1) {
            const currentShowtime = form.getValues(`showTimes.${showtimeIndex}`);
            const newAvailability = {
                id: `sta-${newTicketType.id}`, 
                ticketTypeId: newTicketType.id,
                ticketTypeName: newTicketType.name,
                availableCount: newTicketType.availability
            };
            const updatedAvailabilities = [...currentShowtime.ticketAvailabilities, newAvailability];
            updateShowTime(showtimeIndex, { ...currentShowtime, ticketAvailabilities: updatedAvailabilities });
        }
        
        toast({ title: "Ticket Type Created", description: `Added "${newTicketType.name}" to the showtime.` });
        setAddTicketTypeDialogOpen(false);
    } catch (error) {
        toast({
            title: "Error Creating Ticket Type",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsSubmittingTicketType(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    setIsDeletingTicketType(true);
    const { id: ticketTypeId, index } = ticketToDelete;

    if (!ticketTypeId || ticketTypeId.startsWith('temp-')) {
      removeTicketType(index);
      toast({ title: "Ticket Type Removed", description: "The new ticket type has been removed from the form." });
      setIsDeletingTicketType(false);
      setIsDeleteDialogOpen(false);
      setTicketToDelete(null);
      return;
    }
    
    try {
      await deleteTicketType(ticketTypeId);
      toast({
        title: "Ticket Type Deleted",
        description: `"${ticketToDelete.name}" has been permanently deleted.`,
      });
      removeTicketType(index);
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "This ticket type might be in use and cannot be deleted.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingTicketType(false);
      setIsDeleteDialogOpen(false);
      setTicketToDelete(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data, imageFile))} className="space-y-8">
        
        <Tabs defaultValue="core" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="core">Core Details</TabsTrigger>
            <TabsTrigger value="showtimes" disabled={!initialData}>Showtimes</TabsTrigger>
            <TabsTrigger value="tickets" disabled={!initialData}>Ticket Types</TabsTrigger>
          </TabsList>

          <TabsContent value="core">
            <section className="space-y-6 p-1 mt-6">
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
                        <FormLabel>Main Event Date</FormLabel>
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
                        <FormDescription className="text-xs">The primary date for the event listing.</FormDescription>
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
                            <SelectItem key={String(cat.id)} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
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
                render={() => (
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
                    <FormLabel>Event Image</FormLabel>
                    <div className="space-y-3">
                        <FormControl>
                        <Input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange} 
                            className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-primary/10 file:text-primary
                            hover:file:bg-primary/20"
                        />
                        </FormControl>
                        <FormDescription className="text-xs">
                        Select local image, use AI generation, or paste a URL below.
                        </FormDescription>
                        <Input 
                            placeholder="Or paste image URL here"
                            value={field.value?.startsWith("data:image/") ? "(Local or AI image selected)" : field.value || ""}
                            onChange={(e) => {
                                field.onChange(e.target.value);
                                setLocalImagePreview(e.target.value);
                                setImageFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = ""; 
                            }}
                            disabled={field.value?.startsWith("data:image/")} 
                        />
                         {localImagePreview && (
                            <div className="mt-2 relative w-full aspect-video max-w-sm border rounded-md overflow-hidden bg-muted">
                                <Image
                                src={localImagePreview}
                                alt="Event image preview"
                                fill
                                style={{ objectFit: 'contain' }}
                                data-ai-hint="event poster"
                                onError={() => setLocalImagePreview(null)}
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
          </TabsContent>

          <TabsContent value="showtimes">
             <section className="space-y-6 p-1 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center"><Clock className="mr-2"/> Showtimes</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => setAddShowTimeDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Showtime
                </Button>
              </div>
              <FormDescription>Add specific dates and times for the event. For each showtime, set the number of available tickets for each type you defined earlier.</FormDescription>
              <div className="space-y-4">
                {showTimeFields.map((field, index) => (
                  <ShowTimeSubForm key={field.id} form={form} showtimeIndex={index} removeShowTime={removeShowTime} openAddTicketTypeDialog={openAddTicketTypeDialog} />
                ))}
                {showTimeFields.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No showtimes defined. Add one to get started.</p>}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="tickets">
            <section className="space-y-6 p-1 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center"><Ticket className="mr-2"/> Ticket Type Definitions</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendTicketType({ name: "New Ticket", price: 0, availability: 100, description: "" })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket Type
                </Button>
              </div>
              <FormDescription>Define the types of tickets available for this event (e.g., General, VIP). These definitions will be used as templates for showtimes.</FormDescription>
              <div className="space-y-4">
                {ticketTypeFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-muted/30 relative">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-destructive hover:text-destructive" 
                      onClick={() => {
                        const ticketInfo = form.getValues(`ticketTypes.${index}`);
                        setTicketToDelete({ id: ticketInfo.id, name: ticketInfo.name, index });
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`ticketTypes.${index}.name`} render={({ field }) => (
                                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`ticketTypes.${index}.price`} render={({ field }) => (
                                <FormItem><FormLabel>Price (LKR)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name={`ticketTypes.${index}.availability`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Template Availability</FormLabel>
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                                <FormDescription className="text-xs">This sets the default availability when adding a new showtime.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`ticketTypes.${index}.description`} render={({ field }) => (
                            <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                  </div>
                ))}
                {ticketTypeFields.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No ticket types defined. Add one to get started.</p>}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the ticket type:
                <div className="my-2 p-2 bg-muted rounded-md border text-foreground">
                    <p><span className="font-semibold">Name:</span> {ticketToDelete?.name}</p>
                    <p><span className="font-semibold">ID:</span> <code className="text-xs font-mono">{ticketToDelete?.id || 'N/A (new)'}</code></p>
                </div>
                Deleting a ticket type definition may fail if it is currently in use by a showtime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTicketToDelete(null)} disabled={isDeletingTicketType}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeletingTicketType}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingTicketType && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Ticket Type
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isAddShowTimeDialogOpen} onOpenChange={setAddShowTimeDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Showtime</DialogTitle>
                    <DialogDescription>
                        Specify a new date and time. This will add a showtime to the form, pre-populated with your defined ticket types.
                    </DialogDescription>
                </DialogHeader>
                <ShowTimeForm
                    onSubmit={handleShowTimeDialogSubmit}
                    isSubmitting={isSubmittingShowTime}
                    submitButtonText="Add to Form"
                    onCancel={() => setAddShowTimeDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
        
        <Dialog open={isAddTicketTypeDialogOpen} onOpenChange={(isOpen) => {
            setAddTicketTypeDialogOpen(isOpen);
            if (!isOpen) setCurrentTargetShowtimeId(null);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Ticket Type</DialogTitle>
                    <DialogDescription>
                        Enter the details for a new ticket type for this specific showtime.
                    </DialogDescription>
                </DialogHeader>
                <TicketTypeForm 
                    onSubmit={handleTicketTypeDialogSubmit}
                    isSubmitting={isSubmittingTicketType}
                    onCancel={() => setAddTicketTypeDialogOpen(false)}
                    selectedShowtimeId={currentTargetShowtimeId}
                />
            </DialogContent>
        </Dialog>

        <div className="flex gap-2 justify-end pt-4 border-t">
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


// Sub-component for managing a single showtime within the form
function ShowTimeSubForm({ form, showtimeIndex, removeShowTime, openAddTicketTypeDialog }: { form: any, showtimeIndex: number, removeShowTime: (index: number) => void, openAddTicketTypeDialog: (showtimeId: string) => void }) {
  const { fields, remove } = useFieldArray({
    control: form.control,
    name: `showTimes.${showtimeIndex}.ticketAvailabilities`
  });

  return (
    <div className="p-4 border rounded-lg bg-muted/30 relative space-y-4">
      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:text-destructive" onClick={() => removeShowTime(showtimeIndex)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <FormField
        control={form.control}
        name={`showTimes.${showtimeIndex}.dateTime`}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Showtime Date & Time</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant={"outline"} className={cn("w-full md:w-1/2 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP p") : <span>Pick date & time</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                 <div className="p-2 border-t border-border">
                    <Input
                      type="time"
                      value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        const currentDate = field.value ? new Date(field.value) : new Date();
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

      <div className="pl-4 border-l-2 border-border/50 space-y-3">
         <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold">Ticket Availability</h4>
             <Button type="button" variant="outline" size="sm" onClick={() => openAddTicketTypeDialog(form.getValues(`showTimes.${showtimeIndex}.id`))}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket Type
            </Button>
        </div>
        {fields.map((item, availIndex) => (
          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[2fr,1fr,auto] items-end gap-2">
            <FormItem>
              {availIndex === 0 && <FormLabel className="text-xs">Ticket Type</FormLabel>}
              <div className="flex items-center h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {form.getValues(`showTimes.${showtimeIndex}.ticketAvailabilities.${availIndex}.ticketTypeName`)}
              </div>
            </FormItem>
            <FormField control={form.control} name={`showTimes.${showtimeIndex}.ticketAvailabilities.${availIndex}.availableCount`} render={({ field }) => (
              <FormItem>
                {availIndex === 0 && <FormLabel className="text-xs">Count</FormLabel>}
                <FormControl><Input type="number" placeholder="Count" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive/70 hover:text-destructive" onClick={() => remove(availIndex)}><Trash2 className="h-4 w-4"/></Button>
          </div>
        ))}
         {fields.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">No availability specified for this showtime.</p>}
      </div>
    </div>
  );
}

    

    
