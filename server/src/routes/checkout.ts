import express from 'express';
import Stripe from 'stripe';
import { Order } from '../models/Order';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

// POST /api/checkout - Create Stripe checkout session
router.post('/', async (req, res) => {
  const { items, customer } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 500 ? 0 : 15;
    const total = subtotal + shipping;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerEmail: customer?.email || '',
        customerName: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
        itemCount: String(items.length),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      subtotal,
      shipping,
      total,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment' });
  }
});

// POST /api/checkout/confirm - Confirm payment and create order
router.post('/confirm', async (req, res) => {
  const { paymentIntentId, items, customer } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not confirmed' });
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const shipping = subtotal > 500 ? 0 : 15;
    const total = subtotal + shipping;

    const order = new Order({
      items: items.map((item: any) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        originalPrice: item.originalPrice || item.price,
        name: item.name,
        brand: item.brand,
        image: item.image,
        size: item.size,
        spread: (item.price - (item.originalPrice || item.price)) * item.quantity,
      })),
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: {
          street: customer.address,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
          country: customer.country || 'US',
        },
      },
      subtotal,
      shipping,
      tax: 0,
      total,
      stripePaymentId: paymentIntentId,
      paymentStatus: 'paid',
      fulfillmentStatus: 'pending',
    });

    await order.save();
    res.status(201).json(order);
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// POST /api/checkout/webhook - Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event: Stripe.Event;
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body as Stripe.Event;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', (event.data.object as any).id);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', (event.data.object as any).id);
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
