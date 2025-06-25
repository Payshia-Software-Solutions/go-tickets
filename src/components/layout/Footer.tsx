
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-[hsl(var(--footer-background))] text-[hsl(var(--footer-foreground))] border-t border-[hsl(var(--footer-border))]">
      <div className="container py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="block mb-4">
              <span className="text-xl font-bold text-primary font-headline">GoTickets<span className="text-primary">.</span><span className="text-accent">lk</span></span>
            </Link>
            <p className="text-sm opacity-80">
              Your ultimate destination for discovering and booking tickets for events worldwide.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--footer-foreground))] mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/search" className="hover:text-primary transition-colors text-sm opacity-80 hover:opacity-100">Browse Events</Link></li>
              <li><Link href="/#categories" className="hover:text-primary transition-colors text-sm opacity-80 hover:opacity-100">Categories</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors text-sm opacity-80 hover:opacity-100">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors text-sm opacity-80 hover:opacity-100">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--footer-foreground))] mb-4">Connect With Us</h3>
            <div className="flex space-x-4 mb-4">
              <Link href="#" aria-label="Facebook" className="text-[hsl(var(--footer-foreground))] opacity-70 hover:opacity-100 hover:text-primary transition-colors"><Facebook size={24} /></Link>
              <Link href="#" aria-label="Twitter" className="text-[hsl(var(--footer-foreground))] opacity-70 hover:opacity-100 hover:text-primary transition-colors"><Twitter size={24} /></Link>
              <Link href="#" aria-label="Instagram" className="text-[hsl(var(--footer-foreground))] opacity-70 hover:opacity-100 hover:text-primary transition-colors"><Instagram size={24} /></Link>
              <Link href="#" aria-label="LinkedIn" className="text-[hsl(var(--footer-foreground))] opacity-70 hover:opacity-100 hover:text-primary transition-colors"><Linkedin size={24} /></Link>
            </div>
            <p className="text-sm opacity-80">&copy; {new Date().getFullYear()} GoTickets.lk. All rights reserved.</p>
          </div>
        </div>
        <div className="text-center mt-8 pt-8 border-t border-[hsl(var(--footer-border))] opacity-70">
          <p className="text-xs">
            Powered by Payshia Software Solutions
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
