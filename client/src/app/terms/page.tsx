
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Read the terms and conditions for using the GoTickets.lk platform.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <header className="text-center mb-12">
        <Shield className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">Terms and Conditions</h1>
        <p className="mt-4 text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>
            Welcome to GoTickets.lk. These Terms and Conditions govern your use of our website and services. By accessing or using our platform, you agree to be bound by these terms. If you do not agree with any part of the terms, you may not use our service.
          </p>

          <h3>1. User Accounts</h3>
          <p>
            To access certain features, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h3>2. Ticket Purchases</h3>
          <p>
            All ticket prices are listed in LKR. We accept various forms of payment as indicated on the checkout page. By completing a purchase, you agree to pay the total amount for the tickets, including any applicable fees. All sales are final, except as outlined in our Refund Policy.
          </p>

          <h3>3. Event Conduct</h3>
          <p>
            You agree to abide by the rules and policies of the event venue and organizer. Failure to do so may result in your ejection from the event without a refund. GoTickets.lk is not responsible for the conduct of attendees or the quality of the event itself.
          </p>
          
          <h3>4. Intellectual Property</h3>
          <p>
            The content on our platform, including text, graphics, logos, and software, is the property of GoTickets.lk or its content suppliers and is protected by copyright and other intellectual property laws. You may not use, reproduce, or distribute any content from our platform without our prior written permission.
          </p>
          
          <h3>5. Limitation of Liability</h3>
          <p>
            To the fullest extent permitted by law, GoTickets.lk shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of our platform or attendance at any event booked through our platform.
          </p>
          
          <h3>6. Changes to Terms</h3>
          <p>
            We reserve the right to modify these Terms and Conditions at any time. We will notify you of any changes by posting the new terms on this page. Your continued use of the service after any such changes constitutes your acceptance of the new terms.
          </p>
          
           <h3>7. Governing Law</h3>
          <p>
            These terms shall be governed and construed in accordance with the laws of Sri Lanka, without regard to its conflict of law provisions.
          </p>

        </CardContent>
      </Card>
    </div>
  );
}
