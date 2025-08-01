
"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// Define the event type, as it's not standard in all TS lib versions
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PwaInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const { toast, dismiss } = useToast();
  const [toastId, setToastId] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);

      // Show the toast notification if it's not already visible
      if (!toastId) {
        const newToast = toast({
          title: "Install GoTickets.lk App",
          description: "Get a better experience by installing our app on your device.",
          duration: Infinity, // Keep it open until dismissed
          action: (
            <Button
              onClick={() => handleInstallClick(event as BeforeInstallPromptEvent)}
            >
              <Download className="mr-2 h-4 w-4" />
              Install
            </Button>
          ),
        });
        setToastId(newToast.id);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [toast, toastId]); // Rerun if toast changes

  const handleInstallClick = async (event: BeforeInstallPromptEvent) => {
    if (!event) {
      return;
    }

    // Show the install prompt
    await event.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await event.userChoice;
    
    // We've used the prompt, and it can't be used again, so clear it
    setInstallPromptEvent(null);

    // Dismiss the toast
    if (toastId) {
        dismiss(toastId);
        setToastId(null);
    }
  };

  // This component doesn't render anything itself, it just manages the toast
  return null;
};

export default PwaInstallPrompt;
