/**
 * Stripe Server Configuration
 * @dirty-apple - Server-side Stripe operations
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export const getStripeServer = (): Stripe => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeInstance;
};

export type PaymentFlowType = 
  | 'affiliate_redirect'
  | 'direct_fulfillment';

export interface PaymentMetadata {
  flowType: PaymentFlowType;
  productId: string;
  retailerId: string;
  affiliateCommission: number;
  retailerPayout: number;
  platformRevenue: number;
  orderId?: string;
  customerEmail?: string;
}

export async function createPaymentIntent(
  amount: number,
  metadata: PaymentMetadata,
  idempotencyKey: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeServer();

  if (amount < 50) throw new Error('Minimum amount is $0.50');
  if (amount > 99999999) throw new Error('Maximum amount is $999,999.99');

  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      ...metadata,
      flowType: metadata.flowType,
    },
    automatic_payment_methods: { enabled: true },
    capture_method: 'automatic',
  }, { idempotencyKey });
}

export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeServer();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<Stripe.Refund> {
  const stripe = getStripeServer();
  const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
  if (amount) params.amount = amount;
  if (reason) params.reason = reason;
  return stripe.refunds.create(params);
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripeServer();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function createConnectAccount(
  email: string,
  businessName: string
): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = getStripeServer();
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    business_profile: { name: businessName },
    capabilities: { transfers: { requested: true } },
  });
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL || 'http://localhost:3000'}/connect/refresh`,
    return_url: `${process.env.APP_URL || 'http://localhost:3000'}/connect/complete`,
    type: 'account_onboarding',
  });
  return { accountId: account.id, onboardingUrl: accountLink.url };
}

export async function createTransferToRetailer(
  amount: number,
  connectedAccountId: string,
  transferGroup: string
): Promise<Stripe.Transfer> {
  const stripe = getStripeServer();
  return stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: connectedAccountId,
    transfer_group: transferGroup,
  });
}

export default getStripeServer;
