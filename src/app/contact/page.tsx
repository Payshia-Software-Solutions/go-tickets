
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, MessageSquare, Send } from 'lucide-react';
import Image from 'next/image';


// Cannot export metadata from a client component. 
// If this page needs dynamic metadata, convert to Server Component or use metadata in layout.
// For now, this static metadata object won't be used by Next.js as this is a client component.
// To make this work, this page would need to be a Server Component, or metadata handled in a parent layout.
// export const metadata: Metadata = {
//   title: 'Contact Us - MyPass.lk',
//   description: 'Get in touch with MyPass.lk for support, inquiries, or feedback. We are here to help you with your event ticket booking needs.',
//   openGraph: {
//     title: 'Contact MyPass.lk',
//     description: 'Reach out to the MyPass.lk team. We value your feedback and are ready to assist.',
//   },
// };


export default function ContactPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission logic
    alert('Message sent (mock)! Thank you for contacting us.');
    // Add toast notification here in a real app
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <header className="text-center mb-12">
        <MessageSquare className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">Contact Us</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          We&apos;d love to hear from you! Whether you have a question, feedback, or need support, feel free to reach out.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Contact Information Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Get In Touch</CardTitle>
            <CardDescription>Find our contact details below or use the form to send us a message directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Our Office</h3>
                <p className="text-muted-foreground">
                  123 Event Horizon Way<br />
                  Innovation City, IC 54321<br />
                  Digital Realm
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Email Us</h3>
                <p className="text-muted-foreground">
                  Support: <a href="mailto:support@eventhorizon.com" className="text-accent hover:underline">support@eventhorizon.com</a><br />
                  Inquiries: <a href="mailto:info@eventhorizon.com" className="text-accent hover:underline">info@eventhorizon.com</a>
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Call Us</h3>
                <p className="text-muted-foreground">
                  Main Line: +1 (555) 123-4567<br />
                  Customer Support: +1 (555) 987-6543 (Mon-Fri, 9am-5pm)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Form Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Send Us a Message</CardTitle>
            <CardDescription>Fill out the form and we&apos;ll get back to you as soon as possible.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" type="text" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" type="text" placeholder="Regarding my booking..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Your message here..." rows={5} required />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Send className="mr-2 h-5 w-5" /> Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Map Placeholder Section */}
      <section className="mt-16">
        <Card className="shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center">
              <MapPin className="mr-2 h-7 w-7 text-accent" /> Find Us on the Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Replace with an actual map embed in a real application */}
            <div className="aspect-video bg-muted flex items-center justify-center">
               <Image 
                src="https://placehold.co/1200x600.png" 
                alt="Map placeholder showing a generic city map" 
                width={1200} 
                height={600} 
                className="object-cover w-full h-full"
                data-ai-hint="city map location"
              />
            </div>
          </CardContent>
          <CardContent className="pt-4 text-center">
             <p className="text-sm text-muted-foreground">This is a placeholder map. Our office is virtually everywhere events are!</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
