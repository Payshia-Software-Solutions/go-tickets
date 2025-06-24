
"use client";

import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Trash2, PlusCircle } from "lucide-react";

// This component is now being replaced by the logic inside EventForm.tsx
// to simplify the file structure and state management.
// It can be deleted, but for now, we'll just leave it un-used.
// Keeping it here in case there's a need to revert to a sub-component structure.

export default function ShowTimeSubForm({ form, showtimeIndex, removeShowTime, ticketTypes }: { form: any, showtimeIndex: number, removeShowTime: (index: number) => void, ticketTypes: any[] }) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: `showTimes.${showtimeIndex}.ticketAvailabilities`
  });

  const handleTicketTypeChange = (value: string, availIndex: number) => {
    const selectedType = ticketTypes.find(tt => tt.id === value);
    update(availIndex, {
      ...form.getValues(`showTimes.${showtimeIndex}.ticketAvailabilities`)[availIndex],
      ticketTypeId: value,
      ticketTypeName: selectedType?.name || "",
    })
  };

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
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pl-4 border-l-2 border-border/50 space-y-3">
        <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold">Ticket Availability</h4>
             <Button type="button" variant="ghost" size="sm" onClick={() => append({ ticketTypeId: "", ticketTypeName: "", availableCount: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Availability
             </Button>
        </div>
        {fields.map((item, availIndex) => (
          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[2fr,1fr,auto] items-end gap-2">
            <FormField control={form.control} name={`showTimes.${showtimeIndex}.ticketAvailabilities.${availIndex}.ticketTypeId`} render={({ field }) => (
              <FormItem>
                {availIndex === 0 && <FormLabel className="text-xs">Ticket Type</FormLabel>}
                <Select onValueChange={(value) => handleTicketTypeChange(value, availIndex)} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select ticket type..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {ticketTypes.map(tt => <SelectItem key={tt.id || tt.name} value={tt.id || ''}>{tt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
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

    