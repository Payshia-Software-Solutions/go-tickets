
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Ticket, Clock, Loader2 } from 'lucide-react';
import type { TicketType, ShowTime, TicketTypeFormData, AddShowTimeFormData } from '@/lib/types';
import { createTicketType, createShowTime, fetchTicketTypesForEvent, getShowTimesForEvent } from '@/lib/mockData';
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

  // New state to track which showtime to add a ticket type to
  const [currentTargetShowtimeId, setCurrentTargetShowtimeId] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all ticket types for the event. We'll filter them by showtime on the client.
      const fetchedTicketTypes = await fetchTicketTypesForEvent(eventId);
      const fetchedShowTimes = await getShowTimesForEvent(eventId);
      setTicketTypes(fetchedTicketTypes);
      setShowTimes(fetchedShowTimes);
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
    if (!data.showtimeId) {
      toast({ title: "Error", description: "Cannot add ticket: No showtime was selected in the form.", variant: "destructive" });
      return;
    }
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
      setCurrentTargetShowtimeId(null); // Reset after closing
    }
  };

  const handleAddShowTime = async (data: AddShowTimeFormData) => {
    setIsSubmitting(true);
    try {
      await createShowTime(eventId, data);
      toast({ title: "Success", description: "Showtime created successfully." });
      setShowAddShowTimeDialog(false);
      fetchDetails(); // Refresh list of showtimes
    } catch (error) {
      console.error("Failed to create showtime:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not create showtime.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openAddTicketTypeDialog = (showtimeId: string) => {
    setCurrentTargetShowtimeId(showtimeId);
    setShowAddTicketTypeDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center"><Clock className="mr-2" /> Showtimes</CardTitle>
            <CardDescription>Add showtimes for the event. Then add ticket types to each showtime.</CardDescription>
          </div>
          <Button onClick={() => setShowAddShowTimeDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Showtime
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin mr-2" /> Loading details...</div>
          ) : showTimes.length === 0 ? (
            <p className="text-muted-foreground text-center p-4">No showtimes created yet. Add one to begin.</p>
          ) : (
            <div className="space-y-4">
              {showTimes.map(st => (
                <div key={st.id} className="p-4 border rounded-md bg-muted/30">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold">{new Date(st.dateTime).toLocaleString()}</p>
                    <Button variant="outline" size="sm" onClick={() => openAddTicketTypeDialog(st.id)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Ticket Type
                    </Button>
                  </div>
                  <ul className="space-y-1 pl-2">
                    {ticketTypes.filter(tt => tt.showtimeId === st.id).length > 0 ? (
                      ticketTypes.filter(tt => tt.showtimeId === st.id).map(tt => (
                        <li key={tt.id} className="text-sm text-muted-foreground flex justify-between items-center">
                          <span><Ticket className="inline h-4 w-4 mr-2" />{tt.name}</span>
                          <span className="font-mono text-xs">LKR {tt.price.toFixed(2)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-muted-foreground italic">No ticket types added for this showtime yet.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={onFinished} variant="default" size="lg">Done</Button>
      </div>

      {/* Add Ticket Type Dialog */}
      <Dialog open={showAddTicketTypeDialog} onOpenChange={(isOpen) => {
          setShowAddTicketTypeDialog(isOpen);
          if (!isOpen) {
              setCurrentTargetShowtimeId(null);
          }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Ticket Type</DialogTitle>
            <DialogDescription>Enter details for a ticket type for the selected showtime.</DialogDescription>
          </DialogHeader>
          <TicketTypeForm 
            onSubmit={handleAddTicketType}
            isSubmitting={isSubmitting}
            onCancel={() => {
              setShowAddTicketTypeDialog(false);
              setCurrentTargetShowtimeId(null);
            }}
            showtimes={showTimes}
            selectedShowtimeId={currentTargetShowtimeId}
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
