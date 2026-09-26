"use client";

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger progress finish on route change complete
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Listen to link clicks to trigger instant top bar start
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLAnchorElement;
      if (
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.href.includes('#') &&
        target.target !== '_blank' &&
        target.href !== window.location.href
      ) {
        startProgress();
      }
    };

    const attachClickListeners = () => {
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach((a) => {
        a.removeEventListener('click', handleAnchorClick as EventListener);
        a.addEventListener('click', handleAnchorClick as EventListener);
      });
    };

    attachClickListeners();

    // Re-attach listeners periodically or on DOM changes
    const observer = new MutationObserver(() => {
      attachClickListeners();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startProgress = () => {
    setLoading(true);
    setProgress(15);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 85;
        }
        return prev + Math.random() * 12;
      });
    }, 150);
  };

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-all duration-300 ease-out"
      style={{
        opacity: progress === 100 ? 0 : 1,
      }}
    >
      <div
        className="h-[3px] bg-gradient-to-r from-primary via-accent to-orange-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}
