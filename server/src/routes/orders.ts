import express from 'express';
import { Order } from '../models/Order';
import { isAdmin, requireAdmin } from '../middleware/requireAdmin';
import { hashToken, UUID_PATTERN } from '../middleware/session';
import { cancelPendingPayment, publicOrder } from '../lib/orders';

const router = express.Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid pagination' });
    }
    const [orders, total] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(),
    ]);
    res.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.get('/email/:email', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.email': req.params.email.toLowerCase() }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(orders);
  } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const admin = isAdmin(req);
    const token = req.get('x-order-token');
    const sessionId = req.get('x-session-id');
    if (!admin && (!token || !UUID_PATTERN.test(token) || !sessionId || !UUID_PATTERN.test(sessionId))) {
      return res.status(401).json({ error: 'Order access token and session are required' });
    }
    const filter: Record<string, any> = /^[0-9a-f]{24}$/i.test(req.params.id) ? { _id: req.params.id } : { orderNumber: req.params.id };
    if (!admin) {
      filter.accessTokenHash = hashToken(token!);
      filter.sessionHash = hashToken(sessionId!);
    }
    const order = await Order.findOne(filter).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(admin ? order : publicOrder(order));
  } catch { res.status(500).json({ error: 'Failed to fetch order' }); }
});

// Orders and payment state must originate in verified checkout / Stripe reconciliation.
router.post('/', requireAdmin, (_req, res) => {
  res.status(405).json({ error: 'Orders are created through checkout' });
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    if (!/^[0-9a-f]{24}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid order ID' });
    const { fulfillmentStatus, paymentStatus, trackingNumber, trackingUrl } = req.body;
    if (paymentStatus !== undefined) return res.status(400).json({ error: 'Payment status is managed by Stripe reconciliation' });
    if (fulfillmentStatus !== undefined && !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(fulfillmentStatus)) {
      return res.status(400).json({ error: 'Invalid fulfillment status' });
    }
    if (trackingNumber !== undefined && (typeof trackingNumber !== 'string' || trackingNumber.length > 150)) {
      return res.status(400).json({ error: 'Invalid tracking number' });
    }
    if (trackingUrl !== undefined) {
      try { if (typeof trackingUrl !== 'string' || new URL(trackingUrl).protocol !== 'https:') throw new Error(); }
      catch { return res.status(400).json({ error: 'Tracking URL must use HTTPS' }); }
    }
    const update: Record<string, any> = {};
    if (fulfillmentStatus) update.$set = { fulfillmentStatus };
    if (trackingNumber || trackingUrl) update.$push = { sourceOrders: { trackingNumber, trackingUrl, status: 'shipped' } };
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No supported update provided' });
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (fulfillmentStatus === 'cancelled' && order.stripePaymentId && ['pending', 'failed'].includes(order.paymentStatus)) {
      try { return res.json(await cancelPendingPayment(order)); }
      catch {
        return res.status(409).json({ error: 'Order is closed, but its payment could not be canceled. Reconcile the payment before taking further action.' });
      }
    }
    res.json(order);
  } catch { res.status(500).json({ error: 'Failed to update order' }); }
});

export default router;
