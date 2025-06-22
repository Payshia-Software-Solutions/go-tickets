
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Ticket, Clock, Loader2 } from 'lucide-react';
import type { TicketType, ShowTime, TicketTypeFormData, AddShowTimeFormData } from '@/lib/types';
import { createTicketType, createShowTime, fetchTicketTypesForEvent } from '@/lib/mockData';
import TicketTypeForm from './TicketTypeForm';
import ShowTimeForm from './ShowTimeForm';

interface EventDetailsManagerProps {
  eventId: string;
  onFinished: () => void;
}

export default function EventDetailsManager({ eventId, onFinished }: EventDetailsManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [showTimes, setShowTimes] = useState<ShowTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [showAddTicketTypeDialog, setShowAddTicketTypeDialog] = useState(false);
  const [showAddShowTimeDialog, setShowAddShowTimeDialog] = useState(false);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTicketTypes = await fetchTicketTypesForEvent(eventId);
      // const fetchedShowTimes = await getShowTimesForEvent(eventId); // We need this function
      setTicketTypes(fetchedTicketTypes);
      // setShowTimes(fetchedShowTimes);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({ title: "Error", description: "Could not load ticket types or showtimes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, toast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleAddTicketType = async (data: TicketTypeFormData) => {
    setIsSubmitting(true);
    try {
      await createTicketType(eventId, data);
      toast({ title: "Success", description: "Ticket type created successfully." });
      setShowAddTicketTypeDialog(false);
      fetchDetails(); // Refresh list
    } catch (error) {
      console.error("Failed to create ticket type:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not create ticket type.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddShowTime = async (data: AddShowTimeFormData) => {
    setIsSubmitting(true);
    try {
      await createShowTime(eventId, data);
      toast({ title: "Success", description: "Showtime created successfully." });
      setShowAddShowTimeDialog(false);
      // fetchDetails(); // Refresh list - need getShowTimesForEvent
    } catch (error) {
      console.error("Failed to create showtime:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not create showtime.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center"><Ticket className="mr-2" /> Ticket Types</CardTitle>
            <CardDescription>Define the types of tickets for this event.</CardDescription>
          </div>
          <Button onClick={() => setShowAddTicketTypeDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket Type
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin mr-2" /> Loading...</div>
          ) : ticketTypes.length === 0 ? (
            <p className="text-muted-foreground text-center p-4">No ticket types created yet.</p>
          ) : (
            <ul className="space-y-2">
              {ticketTypes.map(tt => (
                <li key={tt.id} className="p-3 border rounded-md bg-muted/50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{tt.name}</p>
                    <p className="text-sm text-muted-foreground">Price: LKR {tt.price.toFixed(2)} | Availability: {tt.availability}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center"><Clock className="mr-2" /> Showtimes</CardTitle>
            <CardDescription>Add specific dates and times for the event.</CardDescription>
          </div>
          <Button onClick={() => setShowAddShowTimeDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Showtime
          </Button>
        </CardHeader>
        <CardContent>
           <p className="text-muted-foreground text-center p-4">Showtime management coming soon.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={onFinished} variant="default" size="lg">Done</Button>
      </div>

      {/* Add Ticket Type Dialog */}
      <Dialog open={showAddTicketTypeDialog} onOpenChange={setShowAddTicketTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Ticket Type</DialogTitle>
            <DialogDescription>Enter the details for the new ticket type.</DialogDescription>
          </DialogHeader>
          <TicketTypeForm 
            onSubmit={handleAddTicketType}
            isSubmitting={isSubmitting}
            onCancel={() => setShowAddTicketTypeDialog(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Add Showtime Dialog */}
      <Dialog open={showAddShowTimeDialog} onOpenChange={setShowAddShowTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Showtime</DialogTitle>
            <DialogDescription>Specify a date and time for a show.</DialogDescription>
          </DialogHeader>
          <ShowTimeForm 
            onSubmit={handleAddShowTime}
            isSubmitting={isSubmitting}
            onCancel={() => setShowAddShowTimeDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
