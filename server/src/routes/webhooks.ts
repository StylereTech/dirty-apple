import express from 'express';
import Stripe from 'stripe';
import { Order } from '../models/Order';
import { getStripeServer } from '../lib/stripe';
import { recordPayment } from '../lib/orders';

/** Mounted before express.json() so Stripe receives exactly the signed bytes. */
export const stripeWebhookHandler: express.RequestHandler = async (req, res) => {
  const signature = req.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.startsWith('whsec_') || /placeholder|your_webhook/i.test(webhookSecret)) {
    res.status(503).json({ error: 'Stripe webhook is not configured' });
    return;
  }
  if (!signature || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: 'A signed raw webhook payload is required' });
    return;
  }
  let event: Stripe.Event;
  try {
    event = getStripeServer().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }
  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const order = await Order.findOne({ stripePaymentId: intent.id });
      if (order) await recordPayment(order, intent);
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      // A delayed failure must not undo a later success or refund.
      await Order.updateOne(
        { stripePaymentId: intent.id, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed' } },
      );
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntentId) {
        const order = await Order.findOne({ stripePaymentId: paymentIntentId });
        if (order) {
          if (charge.currency !== 'usd' || charge.amount !== Math.round(order.total * 100)) throw new Error('Refund amount mismatch');
          const update: Record<string, any> = { $max: { refundedAmount: charge.amount_refunded / 100 } };
          if (charge.refunded && charge.amount_refunded >= charge.amount) {
            update.$set = { paymentStatus: 'refunded' };
          }
          await Order.updateOne({ _id: order._id }, update);
          if (charge.refunded && charge.amount_refunded >= charge.amount) {
            // Compare the current state atomically; a concurrent shipment must not be reset.
            await Order.updateOne({ _id: order._id, fulfillmentStatus: { $in: ['pending', 'processing'] } }, { $set: { fulfillmentStatus: 'cancelled' } });
          }
        }
      }
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook reconciliation failed:', error?.name || 'Error');
    res.status(500).json({ error: 'Webhook reconciliation failed' });
  }
};

const router = express.Router();
router.post('/stripe', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhookHandler);
export default router;
