
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building, Lightbulb, Users, Target, Heart, Handshake, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About MyPass.lk - Our Mission, Vision, and Team',
  description: 'Learn more about MyPass.lk, your trusted platform for event ticket booking. Discover our story, mission, vision, and the dedicated team behind our success.',
  openGraph: {
    title: 'About MyPass.lk - Our Story and Commitment',
    description: 'Discover the mission, vision, and values that drive MyPass.lk. Meet the team dedicated to making your event experiences seamless and memorable.',
    images: [
      {
        url: '/og-about.png', // Replace with a specific OG image for the about page
        width: 1200,
        height: 630,
        alt: 'About MyPass.lk',
      },
    ],
  },
};

const teamMembers = [
  {
    name: 'Alex Johnson',
    role: 'CEO & Founder',
    imageUrl: 'https://placehold.co/300x300.png',
    avatarFallback: 'AJ',
    bio: 'Visionary leader with a passion for connecting people with unforgettable experiences.',
    dataAiHint: 'professional portrait',
  },
  {
    name: 'Maria Garcia',
    role: 'Head of Engineering',
    imageUrl: 'https://placehold.co/300x300.png',
    avatarFallback: 'MG',
    bio: 'Expert technologist ensuring our platform is robust, scalable, and user-friendly.',
    dataAiHint: 'professional portrait',
  },
  {
    name: 'David Lee',
    role: 'Director of Marketing',
    imageUrl: 'https://placehold.co/300x300.png',
    avatarFallback: 'DL',
    bio: 'Creative strategist dedicated to sharing the magic of live events with the world.',
    dataAiHint: 'professional portrait',
  },
  {
    name: 'Sarah Chen',
    role: 'Customer Success Lead',
    imageUrl: 'https://placehold.co/300x300.png',
    avatarFallback: 'SC',
    bio: 'Champion for our users, ensuring every interaction is smooth and supportive.',
    dataAiHint: 'professional portrait',
  },
];

const whyChooseUsItems = [
  {
    icon: <Target className="h-10 w-10 text-primary" />,
    title: 'Unmatched Selection',
    description: 'From sold-out stadium shows to intimate local gigs, find tickets to the events you love.',
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: 'Secure & Trusted',
    description: 'Book with confidence. Our secure platform ensures your transactions are safe and tickets are authentic.',
  },
  {
    icon: <Handshake className="h-10 w-10 text-primary" />,
    title: 'Seamless Experience',
    description: 'Easy navigation, quick checkout, and instant ticket delivery make booking a breeze.',
  },
  {
    icon: <Heart className="h-10 w-10 text-primary" />,
    title: 'Passion for Events',
    description: 'We\'re event lovers too! Our team is dedicated to helping you discover your next great experience.',
  }
];

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4 space-y-12">
      <header className="text-center">
        <Building className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">About MyPass.lk</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your gateway to unforgettable live experiences. Discover, book, and enjoy events with ease and confidence.
        </p>
      </header>

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-3xl font-headline">
              <Lightbulb className="mr-3 h-8 w-8 text-accent" /> Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg text-foreground leading-relaxed">
            <p>
              At MyPass.lk, our mission is to bridge the gap between event-goers and the experiences that move them. We strive to provide a seamless, secure, and comprehensive platform for discovering and booking tickets to a diverse range of events, from blockbuster concerts and thrilling sports matches to captivating theater performances and vibrant cultural festivals. We believe in the power of live events to create lasting memories and foster connections.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-3xl font-headline">
              <Target className="mr-3 h-8 w-8 text-accent" /> Our Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg text-foreground leading-relaxed">
            <p>
              We envision a world where everyone has effortless access to the live events that enrich their lives. MyPass.lk aims to be the most trusted and innovative ticketing platform, continuously enhancing the user experience through technology, curated event selections, and exceptional customer support. We aspire to be more than just a ticket vendor; we want to be your partner in exploration and enjoyment.
            </p>
          </CardContent>
        </Card>
      </section>
      
      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-3xl font-headline">
               Our Story
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg text-foreground leading-relaxed space-y-4">
            <p>
              Founded by a group of passionate event enthusiasts, MyPass.lk was born out of a desire to simplify the often-complex process of finding and purchasing event tickets. We noticed the frustrations many faced – from difficult-to-navigate websites to concerns about ticket authenticity. We set out to create a platform that addressed these challenges head-on.
            </p>
            <p>
              Since our inception, we've grown from a small startup into a recognized name in event ticketing, always staying true to our core values of transparency, reliability, and customer-centricity. Our journey has been fueled by a love for live entertainment and a commitment to making it accessible to everyone.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-center mb-10 font-headline flex items-center justify-center">
          <Users className="mr-3 h-8 w-8 text-primary" /> Meet Our Team
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <Card key={member.name} className="text-center shadow-md hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-primary/20">
                  <AvatarImage src={member.imageUrl} alt={member.name} data-ai-hint={member.dataAiHint} />
                  <AvatarFallback>{member.avatarFallback}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
                <p className="text-primary font-medium">{member.role}</p>
                <p className="text-sm text-muted-foreground mt-2">{member.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

       <section className="bg-muted py-16 rounded-lg">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">Why Choose MyPass.lk?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUsItems.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                <div className="p-3 bg-primary/10 rounded-full mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
