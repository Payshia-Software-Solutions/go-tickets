
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Understand the refund policy for tickets purchased on GoTickets.lk.',
};

export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <header className="text-center mb-12">
        <RefreshCw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">Refund Policy</h1>
        <p className="mt-4 text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Our Policy on Refunds</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h3>1. General Policy: All Sales Are Final</h3>
          <p>
            Unless otherwise specified for a particular event, all ticket sales on GoTickets.lk are considered final. We do not offer refunds or exchanges for tickets purchased for events that are not cancelled or postponed. Please review your order carefully before confirming your purchase.
          </p>

          <h3>2. Event Cancellations</h3>
          <p>
            If an event is cancelled by the organizer, you will be entitled to a full refund of the ticket's face value. Service fees and any other charges may be non-refundable. We will notify you via email with instructions on how to receive your refund. Refunds will be processed to the original method of payment.
          </p>

          <h3>3. Event Postponements or Rescheduling</h3>
          <p>
            If an event is postponed or rescheduled, your tickets will typically be valid for the new date. You will not be entitled to a refund in this case, unless the event organizer explicitly offers a refund window. We will do our best to communicate all relevant information from the organizer to you via email.
          </p>
          
          <h3>4. Special Circumstances</h3>
          <p>
            In rare cases, refunds may be offered at the discretion of the event organizer or GoTickets.lk. Such circumstances will be evaluated on a case-by-case basis.
          </p>
          
          <h3>5. How to Request a Refund</h3>
          <p>
            If your event has been cancelled and you have not received communication from us within 5 business days, please contact our support team via our <a href="/contact">contact page</a>. Please include your booking ID and event details in your message.
          </p>

        </CardContent>
      </Card>
    </div>
  );
}
