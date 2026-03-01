/**
 * Stripe Checkout Component
 * @dirty-apple - React Stripe Elements checkout form
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getStripe, stripeElementsAppearance } from '@/lib/stripe/client';

interface CheckoutFormProps {
  amount: number;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

interface StripeCheckoutProps {
  amount: number;
  productId: string;
  retailerId: string;
  flowType: 'affiliate_redirect' | 'direct_fulfillment';
  affiliateCommission?: number;
  retailerPayout?: number;
  orderId?: string;
  customerEmail?: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

function CheckoutForm({ amount, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setErrorMessage(result.error.message || 'Payment failed');
      setIsProcessing(false);
      onError?.(result.error.message || 'Payment failed');
    } else {
      const paymentIntent = result.paymentIntent;
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess?.(paymentIntent.id);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg
                   hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Secured by Stripe. Your payment info is encrypted.
      </p>
    </form>
  );
}

export function StripeCheckout({
  amount,
  productId,
  retailerId,
  flowType,
  affiliateCommission = 0,
  retailerPayout = 0,
  orderId,
  customerEmail,
  onSuccess,
  onError,
}: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function createPaymentIntent() {
      try {
        const response = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(amount * 100),
            productId,
            retailerId,
            flowType,
            affiliateCommission: Math.round(affiliateCommission * 100),
            retailerPayout: Math.round(retailerPayout * 100),
            orderId,
            customerEmail,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to initialize checkout');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load checkout';
        setLoadError(message);
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    }

    createPaymentIntent();
  }, [amount, productId, retailerId, flowType, affiliateCommission, retailerPayout, orderId, customerEmail, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading secure checkout...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{loadError}</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm text-red-700 underline">
          Try again
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">Unable to initialize payment.</div>;
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: stripeElementsAppearance,
      }}
    >
      <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

export default StripeCheckout;
