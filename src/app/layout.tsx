

import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Import Inter from next/font
import Script from 'next/script'; // Import Script component
import './globals.css';
import { Providers } from '@/components/Providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FacebookPixelEvents from '@/components/FacebookPixelEvents';
import { Suspense } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XW1Q7R19PV';


// Initialize Inter font with a CSS variable
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter', // Define a CSS variable name
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GoTickets.lk - Your Gateway to Events',
    template: '%s | GoTickets.lk',
  },
  description: 'Discover and book tickets for concerts, sports, theater, festivals, and more on GoTickets.lk. Your ultimate destination for unforgettable live experiences.',
  keywords: ['events', 'tickets', 'concerts', 'sports', 'theater', 'festivals', 'booking', 'GoTickets.lk'],
  manifest: '/manifest.json',
  openGraph: {
    title: {
        default: 'GoTickets.lk - Your Gateway to Events',
        template: '%s | GoTickets.lk',
    },
    description: 'Discover and book tickets for concerts, sports, theater, festivals, and more on GoTickets.lk.',
    siteName: 'GoTickets.lk',
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    images: [
      {
        url: '/og-default.png', // Replace with your actual default OG image path in /public
        width: 1200,
        height: 630,
        alt: 'GoTickets.lk - Event Tickets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
        default: 'GoTickets.lk - Your Gateway to Events',
        template: '%s | GoTickets.lk',
    },
    description: 'Discover and book tickets for concerts, sports, theater, festivals, and more on GoTickets.lk.',
    images: ['/og-default.png'], // Replace with your actual default Twitter image path in /public
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: { // Add favicon and other icons here if you have them in /public
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  return (
    // Apply the font variable class to the html tag
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Google Font <link> tags are removed as next/font handles it */}
      </head>
      {/* The font-body class in Tailwind will now use --font-inter via tailwind.config.ts */}
      <body className="font-body antialiased flex flex-col min-h-screen" suppressHydrationWarning={true}>
        {/* Google Analytics */}
        <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`} />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}');
          `}
        </Script>

        {PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <Providers>
          <Suspense fallback={null}>
            <FacebookPixelEvents />
          </Suspense>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
