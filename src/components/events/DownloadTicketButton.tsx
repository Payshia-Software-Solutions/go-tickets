
"use client";

import React, { useRef, useCallback, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import PrintableTicket from './PrintableTicket';
import { useToast } from '@/hooks/use-toast';

interface DownloadTicketButtonProps {
    booking: Booking;
}

const DownloadTicketButton: React.FC<DownloadTicketButtonProps> = ({ booking }) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const onButtonClick = useCallback(async () => {
        if (ticketRef.current === null) {
            return;
        }

        setIsLoading(true);
        toast({ title: 'Preparing Ticket...', description: 'Please wait while we generate your ticket image.' });

        try {
            const dataUrl = await htmlToImage.toPng(ticketRef.current, {
                cacheBust: true,
                // Higher quality settings
                quality: 1.0,
                pixelRatio: 3, // Increase resolution
            });

            // Create a link and trigger download
            const link = document.createElement('a');
            const safeEventName = booking.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `GoTickets_${safeEventName}_${booking.id}.png`;
            link.href = dataUrl;
            link.click();

            toast({ title: 'Download Started!', description: 'Your ticket has been downloaded.' });

        } catch (err) {
            console.error('Failed to generate ticket image', err);
            toast({
                title: 'Download Failed',
                description: 'Could not generate the ticket image. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }

    }, [ticketRef, booking, toast]);

    return (
        <>
            {/* The actual button visible to the user */}
            <Button onClick={onButtonClick} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Ticket
                    </>
                )}
            </Button>

            {/* 
              This is the hidden component that will be rendered off-screen.
              We render it conditionally when the download starts to avoid having it in the DOM all the time,
              but for simplicity and to ensure fonts/images are loaded, we can keep it mounted but hidden.
              For this implementation, we'll keep it simple and just have it in the DOM but absolutely positioned off-screen.
            */}
            <div className="absolute -left-[9999px] top-0">
                <PrintableTicket ref={ticketRef} booking={booking} />
            </div>
        </>
    );
};

export default DownloadTicketButton;
