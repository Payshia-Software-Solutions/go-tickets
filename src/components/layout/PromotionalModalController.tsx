
"use client";

import { useState, useEffect } from 'react';
import PromotionalModal from '@/components/PromotionalModal';

export default function PromotionalModalController() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if running in the browser
    if (typeof window !== 'undefined') {
      const promoShown = sessionStorage.getItem('promoModalShownThisSession');
      if (!promoShown) {
        // Delay showing the modal slightly to ensure page elements are somewhat loaded
        const timer = setTimeout(() => {
          setIsModalOpen(true);
          sessionStorage.setItem('promoModalShownThisSession', 'true');
        }, 1500); // 1.5-second delay

        return () => clearTimeout(timer); // Cleanup timer on unmount
      }
    }
  }, []);

  if (typeof window === 'undefined') {
    // Don't render anything on the server
    return null;
  }

  return <PromotionalModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />;
}
