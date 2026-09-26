
import { Building, Lightbulb, Users, Target, Heart, Handshake, ShieldCheck, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About GoTickets.lk - Our Mission, Vision, and Team',
  description: 'Learn more about GoTickets.lk, your trusted platform for event ticket booking in Sri Lanka.',
  openGraph: {
    title: 'About GoTickets.lk - Our Story and Commitment',
    description: 'Discover the mission, vision, and values that drive GoTickets.lk.',
  },
};

const teamMembers = [
  {
    name: 'Alex Johnson',
    role: 'CEO & Founder',
    imageUrl: 'https://placehold.co/300x300.png',
    bio: 'Visionary leader with a passion for connecting people with unforgettable experiences.',
    dataAiHint: 'professional portrait',
  },
  {
    name: 'Maria Garcia',
    role: 'Head of Engineering',
    imageUrl: 'https://placehold.co/300x300.png',
    bio: 'Expert technologist ensuring our platform is robust, scalable, and user-friendly.',
    dataAiHint: 'professional portrait',
  },
  {
    name: 'David Lee',
    role: 'Director of Marketing',
    imageUrl: 'https://placehold.co/300x300.png',
    bio: 'Creative strategist dedicated to sharing the magic of live events with the world.',
    dataAiHint: 'professional portrait',
  },
  {
    name: 'Sarah Chen',
    role: 'Customer Success',
    imageUrl: 'https://placehold.co/300x300.png',
    bio: 'Champion for our users, ensuring every interaction is smooth and supportive.',
    dataAiHint: 'professional portrait',
  },
];

const whyChooseUsItems = [
  {
    icon: <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Unmatched Selection',
    description: 'From sold-out stadium shows to intimate local gigs, find tickets to the events you love.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />,
    bg: 'bg-green-50 dark:bg-green-900/20',
    title: 'Secure & Trusted',
    description: 'Book with confidence. Our secure platform ensures your transactions are safe and authentic.',
  },
  {
    icon: <Handshake className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    title: 'Seamless Experience',
    description: 'Easy navigation, quick checkout, and instant ticket delivery make booking a breeze.',
  },
  {
    icon: <Heart className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    title: 'Passion for Events',
    description: 'We&apos;re event lovers too! Our team is dedicated to helping you discover your next great experience.',
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background pb-20">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-6">
            <Building className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
            About <span className="text-accent">GoTickets.lk</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Your gateway to unforgettable live experiences in Sri Lanka. Discover, book, and enjoy events with ease and confidence.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 -mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 container mx-auto px-4">
          
          {/* Mission */}
          <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              We strive to provide a seamless, secure, and comprehensive platform for discovering and booking tickets to a diverse range of events. We believe in the power of live events to create lasting memories and foster connections.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Our Vision</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              We envision a world where everyone has effortless access to the live events that enrich their lives. GoTickets.lk aims to be the most trusted and innovative ticketing platform, continuously enhancing the user experience.
            </p>
          </div>

          {/* Story */}
          <div className="bg-white dark:bg-card p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Our Story</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Founded by passionate event enthusiasts, we were born out of a desire to simplify finding and purchasing tickets in Sri Lanka. Since our inception, we&apos;ve grown always staying true to transparency and reliability.
            </p>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="container mx-auto px-4 mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Why Choose GoTickets.lk?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">We offer the best platform for event-goers and organizers alike.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUsItems.map((item, index) => (
              <div key={index} className="bg-white dark:bg-card p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
                <div className={`p-4 rounded-full ${item.bg} mb-5`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="container mx-auto px-4 mt-24 mb-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Meet Our Team</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">The passionate people behind Sri Lanka&apos;s leading ticketing platform.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div key={member.name} className="bg-white dark:bg-card rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="relative w-32 h-32 mx-auto mb-5 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-sm">
                  <Image 
                    src={member.imageUrl} 
                    alt={member.name} 
                    fill 
                    className="object-cover" 
                    data-ai-hint={member.dataAiHint}
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{member.name}</h3>
                <p className="text-accent font-semibold text-sm mb-4">{member.role}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
