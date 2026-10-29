import express from 'express';
import { Order } from '../models/Order';
import { requireSession, hashToken, UUID_PATTERN } from '../middleware/session';
import { CommerceError, normalizeCustomer, normalizeItems, priceItems } from '../lib/commerce';
import { getStripeServer } from '../lib/stripe';
import { cancelPendingPayment, publicOrder, recordPayment } from '../lib/orders';

const router = express.Router();
router.use(requireSession);

function fail(res: express.Response, error: any) {
  if (error instanceof CommerceError) return res.status(error.status).json({ error: error.message });
  if (error?.code === 11000) return res.status(409).json({ error: 'Checkout is already being created; retry with the same idempotency key' });
  console.error('Checkout failed:', error?.name || 'Error');
  return res.status(503).json({ error: 'Checkout is temporarily unavailable. Retry with the same checkout request.' });
}

// Pending orders are persisted before Stripe is called. The browser cannot set prices.
router.post('/', async (req, res) => {
  if (process.env.DIRECT_CHECKOUT_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Direct checkout is not available. Retailer listings can be purchased on the retailer website.' });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') || /placeholder|your_webhook/i.test(process.env.STRIPE_WEBHOOK_SECRET)) {
    return res.status(503).json({ error: 'Checkout is not configured' });
  }
  try {
    const idempotencyKey = req.get('idempotency-key');
    if (!idempotencyKey || !UUID_PATTERN.test(idempotencyKey)) throw new CommerceError('A valid Idempotency-Key is required');
    const items = normalizeItems(req.body.items);
    const customer = normalizeCustomer(req.body.customer);
    const requestDigest = hashToken(JSON.stringify({ items, customer }));
    const checkoutKeyHash = hashToken(`${res.locals.sessionHash}:${idempotencyKey}`);
    const stripe = getStripeServer();
    let order = await Order.findOne({ checkoutKeyHash }).select('+requestDigest');
    if (order && order.requestDigest !== requestDigest) {
      throw new CommerceError('Checkout details changed. Start a new checkout request.', 409);
    }
    if (!order) {
      const quote = await priceItems(items);
      order = new Order({
        ...quote, customer, sessionHash: res.locals.sessionHash,
        accessTokenHash: hashToken(idempotencyKey), checkoutKeyHash, requestDigest,
        paymentStatus: 'pending', fulfillmentStatus: 'pending',
      });
      await order.save();
    }
    if (order.paymentStatus === 'refunded' || order.fulfillmentStatus === 'cancelled') {
      throw new CommerceError('This checkout is closed. Start a new checkout.', 410);
    }
    const existingIntent = order.stripePaymentId ? await stripe.paymentIntents.retrieve(order.stripePaymentId) : null;
    if (existingIntent?.status === 'canceled') throw new CommerceError('This checkout is closed. Start a new checkout.', 410);
    if (!existingIntent || ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
      // Retrying an unpaid quote must not revive a delisted/demo item or an obsolete price.
      const current = await priceItems(items);
      if (Math.round(current.total * 100) !== Math.round(order.total * 100)
          || current.items.some((item, index) => Math.round(item.price * 100) !== Math.round(order!.items[index]?.price * 100))) {
        throw new CommerceError('Inventory or prices changed. Review your cart before starting a new checkout.', 409);
      }
    }
    // Processing/paid intents retain their immutable order snapshot; never replace them.
    const paymentIntent = existingIntent || await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100), currency: 'usd',
        payment_method_types: ['card'],
        metadata: { orderId: String(order._id) },
      }, { idempotencyKey: `order-${order._id}` });
    if (!order.stripePaymentId) {
      order.stripePaymentId = paymentIntent.id;
      await order.save();
    }
    // An administrator can close a pending order while Stripe creation is in flight.
    const latest = await Order.findById(order._id);
    if (!latest) throw new CommerceError('Order is unavailable', 409);
    if (latest.fulfillmentStatus === 'cancelled' || latest.paymentStatus === 'refunded') {
      await cancelPendingPayment(latest, paymentIntent);
      throw new CommerceError('This checkout is closed. Start a new checkout.', 410);
    }
    res.json({
      clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id,
      orderId: String(order._id), orderAccessToken: idempotencyKey,
      paymentStatus: paymentIntent.status,
      subtotal: order.subtotal, shipping: order.shipping, tax: order.tax, total: order.total,
    });
  } catch (error) { fail(res, error); }
});

// Safe to retry: confirms only the immutable stored order belonging to this session/token.
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId, orderAccessToken } = req.body;
    if (typeof paymentIntentId !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)
        || typeof orderAccessToken !== 'string' || !UUID_PATTERN.test(orderAccessToken)) {
      throw new CommerceError('Payment and order access token are required');
    }
    const order = await Order.findOne({
      stripePaymentId: paymentIntentId, sessionHash: res.locals.sessionHash,
      accessTokenHash: hashToken(orderAccessToken),
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const paymentIntent = await getStripeServer().paymentIntents.retrieve(paymentIntentId);
    const confirmed = await recordPayment(order, paymentIntent);
    if (confirmed.paymentStatus !== 'paid') return res.status(409).json({ error: 'This order is no longer awaiting payment confirmation' });
    res.json(publicOrder(confirmed));
  } catch (error) { fail(res, error); }
});

export default router;
