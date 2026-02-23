import express from 'express';

const router = express.Router();

interface CartItem {
  _id: string;
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  originalPrice: number;
  quantity: number;
  size: string;
}

// In-memory cart (use Redis in production)
const carts: Map<string, CartItem[]> = new Map();

const getSessionId = (req: express.Request) => (req.headers['x-session-id'] as string) || 'default';

router.get('/', (req, res) => {
  const cart = carts.get(getSessionId(req)) || [];
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ items: cart, subtotal, count: cart.length });
});

router.post('/', (req, res) => {
  const sid = getSessionId(req);
  const { productId, quantity = 1, size, name, brand, image, price, originalPrice } = req.body;
  let cart = carts.get(sid) || [];

  const existing = cart.find(i => i.productId === productId && i.size === size);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      _id: `${productId}-${size}-${Date.now()}`,
      productId,
      name: name || 'Product',
      brand: brand || '',
      image: image || '',
      price: price || 0,
      originalPrice: originalPrice || price || 0,
      quantity,
      size: size || 'One Size',
    });
  }

  carts.set(sid, cart);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ items: cart, subtotal, count: cart.length });
});

router.patch('/:itemId', (req, res) => {
  const sid = getSessionId(req);
  const cart = carts.get(sid) || [];
  const item = cart.find(i => i._id === req.params.itemId);
  if (item) item.quantity = Math.max(1, req.body.quantity);
  carts.set(sid, cart);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ items: cart, subtotal, count: cart.length });
});

router.delete('/:itemId', (req, res) => {
  const sid = getSessionId(req);
  let cart = (carts.get(sid) || []).filter(i => i._id !== req.params.itemId);
  carts.set(sid, cart);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ items: cart, subtotal, count: cart.length });
});

router.delete('/', (req, res) => {
  carts.set(getSessionId(req), []);
  res.json({ items: [], subtotal: 0, count: 0 });
});

export default router;
