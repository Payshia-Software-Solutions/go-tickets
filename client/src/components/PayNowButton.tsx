
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reInitiatePayment } from '@/lib/services/booking.service';

interface PayNowButtonProps {
  bookingId: string;
}

const PayNowButton: React.FC<PayNowButtonProps> = ({ bookingId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayNow = async () => {
    setIsProcessing(true);
    toast({
      title: 'Redirecting to Payment...',
      description: 'Please wait while we prepare the secure payment page.',
    });
    try {
      const paymentHtml = await reInitiatePayment(bookingId);
      
      const formContainer = document.createElement('div');
      formContainer.innerHTML = paymentHtml;
      const paymentForm = formContainer.querySelector('form');

      if (paymentForm) {
        document.body.appendChild(paymentForm);
        paymentForm.submit();
        // The user will be redirected, so we don't need to set isProcessing to false here.
      } else {
        console.error("Payment re-initiation failed: No form found in the API response.");
        toast({
          title: "Payment Initiation Failed",
          description: "Could not find the payment form in the server's response. Please try again or contact support.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Failed to re-initiate payment:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Button
      size="lg"
      className="w-full text-lg py-7 mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
      onClick={handlePayNow}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          Pay Now
        </>
      )}
    </Button>
  );
};

export default PayNowButton;
