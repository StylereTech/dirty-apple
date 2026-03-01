/**
 * Stripe Client Configuration
 * @dirty-apple - Client-side Stripe initialization
 * 
 * SECURITY: Only publishable key here. Never secret keys.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePublishableKey) {
    console.warn('Stripe publishable key not configured');
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

export const stripeElementsAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#000000',
    colorBackground: '#ffffff',
    colorText: '#1a1a1a',
    colorDanger: '#dc2626',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '8px',
  },
};

export const paymentMethodTypes = ['card'];
export const paymentMethodLabels: Record<string, string> = { card: 'Credit or Debit Card' };

export default getStripe;
