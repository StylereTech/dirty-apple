import express from 'express';
import Stripe from 'stripe';
import { Order } from '../models/Order';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20' as any,
});

// POST /api/webhooks/stripe - Handle Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        
        if (paymentIntent.metadata?.orderId) {
          await Order.findByIdAndUpdate(paymentIntent.metadata.orderId, {
            paymentStatus: 'paid',
            fulfillmentStatus: 'processing',
          });
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        
        if (paymentIntent.metadata?.orderId) {
          await Order.findByIdAndUpdate(paymentIntent.metadata.orderId, {
            paymentStatus: 'failed',
          });
        }
        break;
      }
      
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);
        
        if (charge.payment_intent) {
          const order = await Order.findOne({ stripePaymentId: charge.payment_intent });
          if (order) {
            order.paymentStatus = 'refunded';
            order.fulfillmentStatus = 'cancelled';
            await order.save();
          }
        }
        break;
      }
      
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Connect account updated:', account.id);
        break;
      }
      
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        console.log('Transfer created:', transfer.id);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
