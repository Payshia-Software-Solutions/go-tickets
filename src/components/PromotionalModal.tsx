
"use client";

import type { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PromotionalModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const PromotionalModal: FC<PromotionalModalProps> = ({ isOpen, onOpenChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <DialogHeader className="p-0">
          <div className="relative w-full h-48">
            <Image
              src="https://placehold.co/600x300.png"
              alt="Promotional offer"
              layout="fill"
              objectFit="cover"
              data-ai-hint="promotion event ticket"
            />
          </div>
          <div className="p-6">
            <DialogTitle className="text-2xl font-bold text-center mb-2">🎉 Special Discount Just For You! 🎉</DialogTitle>
            <DialogDescription className="text-center text-md">
              Get an exclusive <span className="font-bold text-primary">15% OFF</span> your first ticket booking with Event Horizon!
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="px-6 pb-6 text-center">
          <p className="text-muted-foreground mb-1">
            Use code: <strong className="text-accent text-lg">WELCOME15</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Discover amazing concerts, sports, theater, and more exciting events.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 p-6 bg-muted/50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button asChild type="button" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/search" onClick={() => onOpenChange(false)}>
              Browse Events & Claim
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromotionalModal;
