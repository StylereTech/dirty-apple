import express from 'express';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { requireSession } from '../middleware/session';
import { CommerceError, moneyInCents, quantity, validateProduct } from '../lib/commerce';

const router = express.Router();
router.use(requireSession);
const expiresAt = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

async function cartResponse(cart: any) {
  if (!cart?.items.length) return { items: [], subtotal: 0, count: 0 };
  const products = await Product.find({ _id: { $in: cart.items.map((item: any) => item.productId) } }).lean();
  const byId = new Map(products.map(product => [String(product._id), product]));
  const items = cart.items.map((item: any) => {
    const product = byId.get(item.productId);
    let unavailable = false;
    try { validateProduct(product, item.size); moneyInCents(product!.ourPrice); } catch { unavailable = true; }
    return {
      _id: String(item._id), productId: item.productId, quantity: item.quantity, size: item.size,
      name: product?.name || 'Unavailable product', brand: product?.brand || '', image: product?.images?.[0] || '',
      price: product?.ourPrice || 0, originalPrice: product?.originalPrice || 0, unavailable,
    };
  });
  const subtotal = items.reduce((sum: number, item: any) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;
  return { items, subtotal, count: items.reduce((sum: number, item: any) => sum + item.quantity, 0) };
}

function fail(res: express.Response, error: any) {
  if (error instanceof CommerceError) return res.status(error.status).json({ error: error.message });
  if (error?.name === 'VersionError' || error?.code === 11000) return res.status(409).json({ error: 'Cart changed; refresh and try again' });
  return res.status(500).json({ error: 'Unable to update cart' });
}

router.get('/', async (_req, res) => {
  try {
    const cart = await Cart.findOne({ sessionHash: res.locals.sessionHash, expiresAt: { $gt: new Date() } });
    res.json(await cartResponse(cart));
  } catch (error) { fail(res, error); }
});

router.post('/', async (req, res) => {
  try {
    const { productId: rawProductId, size } = req.body;
    if (typeof rawProductId !== 'string' || !/^[0-9a-f]{24}$/i.test(rawProductId)) throw new CommerceError('Invalid product ID');
    const productId = rawProductId.toLowerCase();
    const requestedQuantity = quantity(req.body.quantity ?? 1);
    const product = await Product.findById(productId).lean();
    const selectedSize = validateProduct(product, size);
    moneyInCents(product!.ourPrice);
    let cart = await Cart.findOne({ sessionHash: res.locals.sessionHash });
    if (!cart) cart = new Cart({ sessionHash: res.locals.sessionHash, items: [], expiresAt: expiresAt() });
    if (cart.expiresAt <= new Date()) cart.items.splice(0);
    const existing = cart.items.find(item => item.productId === productId && item.size === selectedSize);
    if (existing) existing.quantity = quantity(existing.quantity + requestedQuantity);
    else {
      if (cart.items.length >= 50) throw new CommerceError('Cart is limited to 50 items');
      cart.items.push({ productId, quantity: requestedQuantity, size: selectedSize });
    }
    cart.expiresAt = expiresAt();
    await cart.save();
    res.json(await cartResponse(cart));
  } catch (error) { fail(res, error); }
});

router.patch('/:itemId', async (req, res) => {
  try {
    const requestedQuantity = quantity(req.body.quantity);
    const cart = await Cart.findOne({ sessionHash: res.locals.sessionHash, expiresAt: { $gt: new Date() } });
    const item = cart?.items.find(entry => String(entry._id) === req.params.itemId);
    if (!cart || !item) return res.status(404).json({ error: 'Cart item not found' });
    const product = await Product.findById(item.productId).lean();
    validateProduct(product, item.size);
    moneyInCents(product!.ourPrice);
    item.quantity = requestedQuantity;
    cart.expiresAt = expiresAt();
    await cart.save();
    res.json(await cartResponse(cart));
  } catch (error) { fail(res, error); }
});

router.delete('/:itemId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ sessionHash: res.locals.sessionHash, expiresAt: { $gt: new Date() } });
    if (cart) {
      const item = cart.items.find(entry => String(entry._id) === req.params.itemId);
      if (item && req.body?.expectedQuantity !== undefined && (
        item.quantity !== req.body.expectedQuantity || item.productId !== req.body.expectedProductId || item.size !== req.body.expectedSize
      )) {
        return res.status(409).json({ error: 'Cart item changed; it was not removed' });
      }
      item?.deleteOne();
      await cart.save();
    }
    res.json(await cartResponse(cart));
  } catch (error) { fail(res, error); }
});

router.delete('/', async (_req, res) => {
  try {
    await Cart.deleteOne({ sessionHash: res.locals.sessionHash });
    res.json({ items: [], subtotal: 0, count: 0 });
  } catch (error) { fail(res, error); }
});

export default router;
