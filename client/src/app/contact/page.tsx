"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Send, MessageSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import * as fpixel from '@/lib/fpixel';
import { API_BASE_URL } from '@/lib/constants';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      fpixel.track('Contact');

      const response = await fetch(`${API_BASE_URL}/contact/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message. Please try again or contact us directly.');
      }

      setSubmitSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMessage(err.message || 'Could not send your message. Please try calling or emailing us directly.');
    } finally {
      setIsSubmitting(false);
    }
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
            We&apos;re here to help! Reach out to our team for ticket booking inquiries, organizer onboarding, or event assistance.
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
                Need immediate assistance? Find our direct contact details below. Our support team is ready to assist you.
              </p>
            </div>

            <Card className="border-0 shadow-md">
              <CardContent className="p-6 space-y-8">
                {/* Office Address */}
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Our Office</h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                      Grand Silver Ray<br />
                      Dippitigala, Lellopitiya,<br />
                      Ratnapura, Sri Lanka
                    </p>
                  </div>
                </div>

                {/* Email Us */}
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
                        Reservations: <a href="mailto:reservation@silverray.lk" className="text-primary hover:underline font-medium">reservation@silverray.lk</a>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Call Us */}
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 shrink-0">
                    <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Call Us</h3>
                    <div className="text-sm space-y-1.5">
                      <p className="text-slate-700 dark:text-slate-200">
                        Hotline:{' '}
                        <a 
                          href="tel:0718750770" 
                          className="font-bold text-primary hover:underline text-base"
                        >
                          071 875 0770
                        </a>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        International: <a href="tel:+94718750770" className="hover:underline font-mono">+94 71 875 0770</a>
                      </p>
                      <div className="pt-2">
                        <a
                          href="https://wa.me/94718750770?text=Hello%20GoTickets.lk%20Support,%20I%20need%20assistance%20with..."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> WhatsApp Support
                        </a>
                      </div>
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
                  Fill out the form below and our team will get back to you promptly.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {submitSuccess ? (
                  <div className="py-8 px-6 text-center space-y-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in duration-300">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Message Sent Successfully!</h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">
                      Thank you for contacting GoTickets.lk. Your message has been received by our support desk. We will respond via email shortly.
                    </p>
                    <Button 
                      onClick={() => setSubmitSuccess(false)} 
                      variant="outline" 
                      className="mt-2 text-xs"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {errorMessage && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-semibold">Full Name *</Label>
                        <Input 
                          id="name" 
                          type="text" 
                          placeholder="Your Name" 
                          value={formData.name}
                          onChange={handleChange}
                          required 
                          disabled={isSubmitting}
                          className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold">Email Address *</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="your.email@example.com" 
                          value={formData.email}
                          onChange={handleChange}
                          required 
                          disabled={isSubmitting}
                          className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-slate-700 dark:text-slate-300 font-semibold">Subject *</Label>
                      <Input 
                        id="subject" 
                        type="text" 
                        placeholder="Regarding my ticket booking / Event inquiry..." 
                        value={formData.subject}
                        onChange={handleChange}
                        required 
                        disabled={isSubmitting}
                        className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-slate-700 dark:text-slate-300 font-semibold">Message *</Label>
                      <Textarea 
                        id="message" 
                        placeholder="How can we help you?" 
                        rows={6} 
                        value={formData.message}
                        onChange={handleChange}
                        required 
                        disabled={isSubmitting}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 resize-none" 
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-bold bg-accent hover:bg-accent/90 text-white rounded-xl transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" /> Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
