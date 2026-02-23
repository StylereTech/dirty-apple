import express from 'express';
import { Order } from '../models/Order';

const router = express.Router();

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      // Try by order number
      const byNumber = await Order.findOne({ orderNumber: req.params.id }).lean();
      if (!byNumber) return res.status(404).json({ error: 'Order not found' });
      return res.json(byNumber);
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// GET /api/orders/email/:email - Get orders by email
router.get('/email/:email', async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.email': req.params.email })
      .sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders - Create order
router.post('/', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { fulfillmentStatus, paymentStatus, trackingNumber, trackingUrl } = req.body;
    const update: any = {};
    if (fulfillmentStatus) update.fulfillmentStatus = fulfillmentStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (trackingNumber || trackingUrl) {
      update.$push = { sourceOrders: { trackingNumber, trackingUrl, status: 'shipped' } };
    }
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;
