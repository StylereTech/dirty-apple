import express from 'express';
import { Product } from '../models/Product';

const router = express.Router();

// In-memory cart storage (in production, use Redis or session-based storage)
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

// GET /api/cart - Get cart items
router.get('/', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  const cart = carts.get(sessionId) || [];
  res.json({ items: cart });
});

// POST /api/cart - Add item to cart
router.post('/', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  const { productId, quantity = 1, size } = req.body;

  let cart = carts.get(sessionId) || [];

  try {
    // Try to fetch product from database
    const product = await Product.findById(productId);
    
    if (product) {
      const existingItem = cart.find(item => item.productId === productId && item.size === size);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          _id: `${productId}-${Date.now()}`,
          productId,
          name: product.name,
          brand: product.brand,
          image: product.images[0],
          price: product.ourPrice,
          quantity,
          size: size || product.sizes[0] || 'One Size',
        });
      }
    } else {
      // Mock product data if not in database
      const existingItem = cart.find(item => item.productId === productId && item.size === size);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          _id: `${productId}-${Date.now()}`,
          productId,
          name: 'GG Marmont Small Shoulder Bag',
          brand: 'Gucci',
          image: 'https://picsum.photos/seed/gucci1/600/800',
          price: 1699,
          quantity,
          size: size || 'One Size',
        });
      }
    }

    carts.set(sessionId, cart);
    res.json({ items: cart });
  } catch (error) {
    // Fallback to mock data
    const existingItem = cart.find(item => item.productId === productId && item.size === size);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        _id: `${productId}-${Date.now()}`,
        productId,
        name: 'GG Marmont Small Shoulder Bag',
        brand: 'Gucci',
        image: 'https://picsum.photos/seed/gucci1/600/800',
        price: 1699,
        quantity,
        size: size || 'One Size',
      });
    }

    carts.set(sessionId, cart);
    res.json({ items: cart });
  }
});

// PATCH /api/cart/:itemId - Update quantity
router.patch('/:itemId', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = carts.get(sessionId) || [];
  const item = cart.find(i => i._id === itemId);

  if (item) {
    item.quantity = quantity;
    carts.set(sessionId, cart);
  }

  res.json({ items: cart });
});

// DELETE /api/cart/:itemId - Remove item
router.delete('/:itemId', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  const { itemId } = req.params;

  let cart = carts.get(sessionId) || [];
  cart = cart.filter(i => i._id !== itemId);
  carts.set(sessionId, cart);

  res.json({ items: cart });
});

export default router;
