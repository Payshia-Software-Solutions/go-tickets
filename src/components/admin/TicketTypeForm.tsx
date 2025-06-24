
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { TicketTypeFormData, TicketType, ShowTime } from "@/lib/types";
import { TicketTypeFormSchema } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface TicketTypeFormProps {
  initialData?: TicketType | null;
  onSubmit: (data: TicketTypeFormData) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
  onCancel?: () => void;
  showtimes?: ShowTime[];
  selectedShowtimeId?: string | null;
}

export default function TicketTypeForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText = "Save Ticket Type",
  onCancel,
  showtimes,
  selectedShowtimeId,
}: TicketTypeFormProps) {
  const form = useForm<TicketTypeFormData>({
    resolver: zodResolver(TicketTypeFormSchema),
    defaultValues: initialData ? { 
        name: initialData.name, 
        price: initialData.price,
        availability: initialData.availability,
        description: initialData.description || "",
        showtimeId: selectedShowtimeId || undefined,
    } : { 
        name: "General Admission", 
        price: 0, 
        availability: 100, 
        description: "",
        showtimeId: selectedShowtimeId || undefined,
    },
  });

  useEffect(() => {
    form.reset({
        name: initialData?.name || "General Admission",
        price: initialData?.price || 0,
        availability: initialData?.availability || 100,
        description: initialData?.description || "",
        showtimeId: selectedShowtimeId || undefined,
    });
  }, [initialData, selectedShowtimeId, form]);

  const handleFormSubmit = async (data: TicketTypeFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {showtimes && (
          <FormField
            control={form.control}
            name="showtimeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Showtime</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a showtime" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {showtimes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {new Date(st.dateTime).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  This ticket type will be created for the selected showtime.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ticket Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., General Admission, VIP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (LKR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 50.00"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Availability</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    {...field}
                    onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormDescription className="text-xs">Total count for this ticket type.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Includes backstage pass" {...field} rows={2} />
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
