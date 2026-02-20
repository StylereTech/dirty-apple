import express from 'express';
import { Order } from '../models/Order';

const router = express.Router();

// GET /api/orders/:id - Get order status
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id).lean();
    
    if (order) {
      return res.json(order);
    }

    res.status(404).json({ error: 'Order not found' });
  } catch (error) {
    res.status(404).json({ error: 'Order not found' });
  }
});

// POST /api/orders - Create new order (called after successful payment)
router.post('/', async (req, res) => {
  const { items, customer, total, stripePaymentId } = req.body;

  try {
    const order = new Order({
      items,
      customer,
      total,
      stripePaymentId,
      status: 'paid',
    });

    await order.save();
    
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

export default router;
