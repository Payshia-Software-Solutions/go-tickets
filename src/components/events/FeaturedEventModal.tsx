"use client";

import type { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Event } from '@/lib/types';
import { Ticket, Zap } from 'lucide-react';

interface FeaturedEventModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  event: Event | null;
}

const FeaturedEventModal: FC<FeaturedEventModalProps> = ({ isOpen, onOpenChange, event }) => {
  if (!event) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <DialogHeader className="p-0">
          <div className="relative w-full h-56">
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              style={{objectFit: 'cover'}}
              data-ai-hint="event concert festival"
            />
          </div>
          <div className="p-6">
            <DialogTitle className="text-2xl font-bold text-center mb-2 font-headline">{event.name}</DialogTitle>
            <DialogDescription className="text-center text-md text-destructive font-semibold flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 animate-pulse" /> Hurry Up! Tickets Almost Sold Out!
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="px-6 pb-6 text-center">
          <p className="text-muted-foreground mb-4">
            Don't miss out on one of the hottest events of the year. Grab your tickets before they're all gone.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 p-6 bg-muted/50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
          <Button asChild type="button" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href={`/events/${event.slug}/book`} onClick={() => onOpenChange(false)}>
              <Ticket className="mr-2 h-4 w-4"/>
              Buy Tickets Now
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeaturedEventModal;
