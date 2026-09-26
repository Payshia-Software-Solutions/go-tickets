
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Send, MessageSquare } from 'lucide-react';
import * as fpixel from '@/lib/fpixel';
import Link from 'next/link';

export default function ContactPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fpixel.track('Contact');
    // Mock submission logic
    alert('Message sent! Thank you for contacting GoTickets.lk support.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header Section */}
      <section className="bg-slate-900 text-white py-16 md:py-20 mb-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-6">
            <MessageSquare className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            We&apos;re here to help! Reach out to our support team for any inquiries, feedback, or assistance with your ticket bookings.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 container mx-auto px-4">
          
          {/* Contact Information Section */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Get In Touch</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Need immediate assistance? Find our direct contact details below. Our support team is available during standard business hours.
              </p>
            </div>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6 space-y-8">
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Our Office</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                      GoTickets.lk Headquarters<br />
                      Colombo 03, Sri Lanka
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 shrink-0">
                    <Mail className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Email Us</h3>
                    <div className="text-sm space-y-1">
                      <p className="text-slate-500 dark:text-slate-400">
                        Support: <a href="mailto:support@gotickets.lk" className="text-primary hover:underline font-medium">support@gotickets.lk</a>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Inquiries: <a href="mailto:info@gotickets.lk" className="text-primary hover:underline font-medium">info@gotickets.lk</a>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 shrink-0">
                    <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Call Us</h3>
                    <div className="text-sm space-y-1">
                      <p className="text-slate-500 dark:text-slate-400">
                        Hotline: <span className="font-medium text-slate-700 dark:text-slate-300">+94 11 234 5678</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        (Mon-Fri, 9:00 AM - 6:00 PM)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form Section */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-accent" />
              <CardHeader className="px-8 pt-8 pb-4">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Send Us a Message</CardTitle>
                <CardDescription className="text-base text-slate-500">
                  Fill out the form below and our team will get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-semibold">Full Name</Label>
                      <Input id="name" type="text" placeholder="John Doe" required className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold">Email Address</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-700 dark:text-slate-300 font-semibold">Subject</Label>
                    <Input id="subject" type="text" placeholder="Regarding my ticket booking..." required className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-700 dark:text-slate-300 font-semibold">Message</Label>
                    <Textarea id="message" placeholder="How can we help you?" rows={6} required className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 resize-none" />
                  </div>
                  <Button type="submit" size="lg" className="w-full h-12 text-base font-bold bg-accent hover:bg-accent/90 text-white rounded-xl">
                    <Send className="mr-2 h-5 w-5" /> Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
