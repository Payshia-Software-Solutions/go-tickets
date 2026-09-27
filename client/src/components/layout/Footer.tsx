
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Facebook, Twitter, Instagram, Linkedin, Phone, MapPin, Mail } from 'lucide-react';

const Footer = () => {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-[hsl(var(--footer-background))] text-[hsl(var(--footer-foreground))] border-t border-[hsl(var(--footer-border))]">
      <div className="container py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="block mb-4">
              <span className="text-xl font-bold text-white font-headline">
                GoTickets<span className="text-accent">.lk</span>
              </span>
            </Link>
            <p className="text-sm opacity-70 leading-relaxed mb-4">
              Your ultimate destination for discovering and booking event tickets across Sri Lanka.
            </p>
            <div className="space-y-2 text-xs opacity-80 pt-2 border-t border-[hsl(var(--footer-border))]">
              <p className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>Grand Silver Ray, Dippitigala, Lellopitiya, Ratnapura</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                <a href="tel:0718750770" className="hover:text-accent font-semibold transition-colors">
                  071 875 0770
                </a>
              </p>
            </div>
          </div>

          {/* Events */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Events</h3>
            <ul className="space-y-2.5">
              <li><Link href="/search" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">Browse All Events</Link></li>
              <li><Link href="/#categories" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">Categories</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Company</h3>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">About Us</Link></li>
              <li><Link href="/contact" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">Contact</Link></li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Legal</h3>
            <ul className="space-y-2.5 mb-6">
              <li><Link href="/terms" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">Privacy Policy</Link></li>
              <li><Link href="/refund" className="text-sm opacity-70 hover:opacity-100 hover:text-accent transition-all">Refund Policy</Link></li>
            </ul>
            <div className="flex gap-3">
              <Link href="#" aria-label="Facebook" className="opacity-60 hover:opacity-100 hover:text-accent transition-all"><Facebook size={20} /></Link>
              <Link href="#" aria-label="Twitter" className="opacity-60 hover:opacity-100 hover:text-accent transition-all"><Twitter size={20} /></Link>
              <Link href="#" aria-label="Instagram" className="opacity-60 hover:opacity-100 hover:text-accent transition-all"><Instagram size={20} /></Link>
              <Link href="#" aria-label="LinkedIn" className="opacity-60 hover:opacity-100 hover:text-accent transition-all"><Linkedin size={20} /></Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-10 pt-8 border-t border-[hsl(var(--footer-border))] opacity-60">
          <p className="text-xs">
            &copy; {new Date().getFullYear()} GoTickets.lk. All rights reserved. &nbsp;·&nbsp;{' '}
            <a href="https://nebulync.com/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
              Powered by Nebulync Software Pvt Ltd
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
