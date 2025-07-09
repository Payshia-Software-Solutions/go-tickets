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
      <DialogContent className="max-w-sm md:max-w-3xl p-0 overflow-hidden grid md:grid-cols-2 gap-0">
        <div className="relative w-full h-48 md:h-full min-h-[250px]">
           <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
              data-ai-hint="event concert festival"
            />
        </div>
        <div className="p-6 flex flex-col justify-between">
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-bold font-headline">{event.name}</DialogTitle>
                <DialogDescription className="text-destructive font-semibold flex items-center gap-2 pt-1">
                    <Zap className="h-5 w-5 animate-pulse" /> Hurry Up! Tickets Almost Sold Out!
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p className="text-muted-foreground text-sm">
                    Don't miss out on one of the hottest events of the year. Grab your tickets before they're all gone.
                </p>
            </div>
            <DialogFooter className="flex-col sm:flex-col sm:items-stretch sm:justify-end gap-2">
                 <Button asChild type="button" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={`/events/${event.slug}/book`} onClick={() => onOpenChange(false)}>
                    <Ticket className="mr-2 h-4 w-4"/>
                    Buy Tickets Now
                    </Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                    Close
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FeaturedEventModal;
