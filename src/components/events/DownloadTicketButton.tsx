
"use client";

import React, { useRef, useCallback, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import type { Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, FileDown, Loader2 } from 'lucide-react';
import PrintableTicket from './PrintableTicket';
import { useToast } from '@/hooks/use-toast';

interface DownloadTicketActionsProps {
    booking: Booking;
    formattedDate: string;
    formattedTime: string;
}

const DownloadTicketActions: React.FC<DownloadTicketActionsProps> = ({ booking, formattedDate, formattedTime }) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [isPngLoading, setIsPngLoading] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const { toast } = useToast();

    const onDownloadImage = useCallback(async () => {
        if (ticketRef.current === null) {
            return;
        }

        setIsPngLoading(true);
        toast({ title: 'Preparing Image...', description: 'Please wait while we generate your ticket image.' });

        try {
            const dataUrl = await htmlToImage.toPng(ticketRef.current, {
                cacheBust: true,
                quality: 1.0,
                pixelRatio: 3,
            });

            const link = document.createElement('a');
            const safeEventName = booking.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `GoTickets_${safeEventName}_${booking.id}.png`;
            link.href = dataUrl;
            link.click();

            toast({ title: 'Download Started!', description: 'Your ticket image has been downloaded.' });

        } catch (err) {
            console.error('Failed to generate ticket image', err);
            toast({
                title: 'Download Failed',
                description: 'Could not generate the ticket image. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsPngLoading(false);
        }
    }, [ticketRef, booking, toast]);

    const onDownloadPdf = useCallback(async () => {
        if (ticketRef.current === null) {
            return;
        }

        setIsPdfLoading(true);
        toast({ title: 'Preparing PDF...', description: 'Please wait while we generate your ticket PDF.' });

        try {
            // Ensure the element is rendered before getting dimensions
            await new Promise(resolve => setTimeout(resolve, 0));
            const element = ticketRef.current;
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;

            const dataUrl = await htmlToImage.toPng(element, {
                cacheBust: true,
                quality: 1.0,
                pixelRatio: 3,
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                // Using exact dimensions of the source element for the PDF page
                format: [elementWidth, elementHeight]
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, elementWidth, elementHeight);

            const safeEventName = booking.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            pdf.save(`GoTickets_${safeEventName}_${booking.id}.pdf`);

            toast({ title: 'Download Started!', description: 'Your ticket PDF has been downloaded.' });

        } catch (err) {
            console.error('Failed to generate ticket PDF', err);
            toast({
                title: 'Download Failed',
                description: 'Could not generate the ticket PDF. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsPdfLoading(false);
        }
    }, [ticketRef, booking, toast]);

    return (
        <>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                <Button onClick={onDownloadImage} disabled={isPngLoading || isPdfLoading} className="w-full sm:w-auto">
                    {isPngLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Image...
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-4 w-4" />
                            Download as Image
                        </>
                    )}
                </Button>
                 <Button onClick={onDownloadPdf} disabled={isPdfLoading || isPngLoading} variant="outline" className="w-full sm:w-auto">
                    {isPdfLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating PDF...
                        </>
                    ) : (
                        <>
                            <FileDown className="mr-2 h-4 w-4" />
                            Download as PDF
                        </>
                    )}
                </Button>
            </div>

            {/* Hidden component that will be rendered off-screen for capturing */}
            <div className="absolute -left-[9999px] top-0">
                <PrintableTicket ref={ticketRef} booking={booking} formattedDate={formattedDate} formattedTime={formattedTime} />
            </div>
        </>
    );
};

export default DownloadTicketActions;
