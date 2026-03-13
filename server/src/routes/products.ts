import express from 'express';
import { Product } from '../models/Product';
import { PriceHistory } from '../models/PriceHistory';

const router = express.Router();

// GET /api/products - List products with filters/search/pagination
router.get('/', async (req, res) => {
  const {
    brand, category, collection, priceMin, priceMax, minDiscount,
    search, sort = 'price-low', page = '1', limit = '12',
    featured, onSale, inStock,
  } = req.query;

  try {
    const filter: any = { status: 'active' };

    if (brand) {
      const brands = (brand as string).split(',');
      filter.brand = { $in: brands };
    }
    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (collection) filter.collectionSlug = collection;
    if (priceMin || priceMax) {
      filter.ourPrice = {};
      if (priceMin) filter.ourPrice.$gte = Number(priceMin);
      if (priceMax) filter.ourPrice.$lte = Number(priceMax);
    }
    if (minDiscount) filter.discount = { $gte: Number(minDiscount) };
    if (featured === 'true') filter.featured = true;
    if (onSale === 'true') filter.isOnSale = true;
    if (inStock === 'true') filter.inStock = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    let sortQuery: any = { ourPrice: 1 };
    switch (sort) {
      case 'price-low': sortQuery = { ourPrice: 1 }; break;
      case 'price-high': sortQuery = { ourPrice: -1 }; break;
      case 'discount': sortQuery = { discount: -1 }; break;
      case 'newest': sortQuery = { createdAt: -1 }; break;
      case 'name': sortQuery = { name: 1 }; break;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(48, Math.max(1, Number(limit)));
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);
    const products = await Product.find(filter)
      .sort(sortQuery)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Get unique brands and categories for filter options
    const brands = await Product.distinct('brand', { status: 'active' });
    const categories = await Product.distinct('category', { status: 'active' });

    res.json({ products, total, page: pageNum, totalPages, brands, categories });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/featured - Get featured products
router.get('/featured', async (_req, res) => {
  try {
    const products = await Product.find({ featured: true, status: 'active' }).limit(8).lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// GET /api/products/deals - Get trending deals (highest discounts)
router.get('/deals', async (_req, res) => {
  try {
    const products = await Product.find({ status: 'active', discount: { $gte: 30 } })
      .sort({ discount: -1 })
      .limit(8)
      .lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET /api/products/collections/:slug - Get products by collection
router.get('/collections/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { sort = 'price-low', page = '1', limit = '12' } = req.query;

    const filter: any = { collectionSlug: slug, status: 'active' };
    let sortQuery: any = { ourPrice: 1 };
    switch (sort) {
      case 'price-low': sortQuery = { ourPrice: 1 }; break;
      case 'price-high': sortQuery = { ourPrice: -1 }; break;
      case 'discount': sortQuery = { discount: -1 }; break;
      case 'newest': sortQuery = { createdAt: -1 }; break;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(48, Number(limit));
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).sort(sortQuery).skip((pageNum - 1) * limitNum).limit(limitNum).lean();

    res.json({ products, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// GET /api/products/slug/:slug - Get product by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Get price history
    const priceHistory = await PriceHistory.find({ product: product._id })
      .sort({ recordedAt: -1 })
      .limit(30)
      .lean();

    // Get related products (same brand or category)
    const related = await Product.find({
      _id: { $ne: product._id },
      status: 'active',
      $or: [{ brand: product.brand }, { category: product.category }],
    }).limit(4).lean();

    res.json({ ...product, priceHistory, related });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const priceHistory = await PriceHistory.find({ product: product._id })
      .sort({ recordedAt: -1 }).limit(30).lean();

    const related = await Product.find({
      _id: { $ne: product._id }, status: 'active',
      $or: [{ brand: product.brand }, { category: product.category }],
    }).limit(4).lean();

    res.json({ ...product, priceHistory, related });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create product (admin)
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/products/:id - Update product (admin)
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/products/:id - Delete product (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
