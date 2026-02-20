import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

// In-memory cart storage (same as cart.ts)
interface CartItem {
  _id: string;
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  quantity: number;
  size: string;
}

const carts: Map<string, CartItem[]> = new Map();

// POST /api/checkout - Create payment intent
router.post('/', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  const { items, customer } = req.body;

  // Get cart items
  let cartItems = items;
  if (!cartItems || cartItems.length === 0) {
    cartItems = carts.get(sessionId) || [];
  }

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    // Calculate total
    const total = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
    const shipping = total > 500 ? 0 : 15;
    const grandTotal = total + shipping;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100), // Stripe expects cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customerEmail: customer?.email || '',
        customerName: customer?.firstName + ' ' + customer?.lastName || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      total,
      shipping,
      grandTotal,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

// POST /api/checkout/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment succeeded:', paymentIntent.id);
      // TODO: Create order in database, update inventory, trigger fulfillment
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', failedPayment.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
