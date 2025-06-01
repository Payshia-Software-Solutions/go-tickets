import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Ticket } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-muted text-muted-foreground border-t">
      <div className="container py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Ticket className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl text-foreground">Event Horizon</span>
            </Link>
            <p className="text-sm">
              Your ultimate destination for discovering and booking tickets for events worldwide.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/search" className="hover:text-primary transition-colors">Browse Events</Link></li>
              <li><Link href="/#categories" className="hover:text-primary transition-colors">Categories</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Connect With Us</h3>
            <div className="flex space-x-4 mb-4">
              <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={24} /></Link>
              <Link href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={24} /></Link>
              <Link href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={24} /></Link>
              <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={24} /></Link>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} Event Horizon Tickets. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
