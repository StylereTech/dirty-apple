import express from 'express';
import { Product } from '../models/Product';

const router = express.Router();

// Mock products for when MongoDB is not available
const mockProducts = [
  { _id: '1', name: 'GG Marmont Small Shoulder Bag', brand: 'Gucci', category: 'Bags', originalPrice: 2350, ourPrice: 1699, discount: 28, images: ['https://picsum.photos/seed/gucci1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
  { _id: '2', name: 'Re-Edition 2005 Saffiano Leather Bag', brand: 'Prada', category: 'Bags', originalPrice: 1850, ourPrice: 1299, discount: 30, images: ['https://picsum.photos/seed/prada1/600/800'], sizes: ['One Size'], retailerSource: 'Nordstrom', inStock: true },
  { _id: '3', name: 'Loulou Small Bag in Quilted Leather', brand: 'Saint Laurent', category: 'Bags', originalPrice: 2590, ourPrice: 1899, discount: 27, images: ['https://picsum.photos/seed/ysl1/600/800'], sizes: ['One Size'], retailerSource: 'Neiman Marcus', inStock: true },
  { _id: '4', name: 'Le Cagole XS Shoulder Bag', brand: 'Balenciaga', category: 'Bags', originalPrice: 1890, ourPrice: 1299, discount: 31, images: ['https://picsum.photos/seed/balenciaga1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
  { _id: '5', name: 'Cassette Bag in Intrecciato', brand: 'Bottega Veneta', category: 'Bags', originalPrice: 3200, ourPrice: 2400, discount: 25, images: ['https://picsum.photos/seed/bv1/600/800'], sizes: ['One Size'], retailerSource: 'Nordstrom', inStock: true },
  { _id: '6', name: 'Pouch in Folded Leather', brand: 'Loewe', category: 'Bags', originalPrice: 1590, ourPrice: 1099, discount: 31, images: ['https://picsum.photos/seed/loewe1/600/800'], sizes: ['One Size'], retailerSource: 'Neiman Marcus', inStock: true },
  { _id: '7', name: 'Triomphe Bag in Shiny Calfskin', brand: 'Celine', category: 'Bags', originalPrice: 2900, ourPrice: 2100, discount: 28, images: ['https://picsum.photos/seed/celine1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
  { _id: '8', name: 'Classic Flap Bag Medium', brand: 'Chanel', category: 'Bags', originalPrice: 8200, ourPrice: 5999, discount: 27, images: ['https://picsum.photos/seed/chanel1/600/800'], sizes: ['Medium'], retailerSource: 'Neiman Marcus', inStock: true },
  { _id: '9', name: 'Suede Ankle Boots', brand: 'Gucci', category: 'Shoes', originalPrice: 1200, ourPrice: 799, discount: 33, images: ['https://picsum.photos/seed/gucci2/600/800'], sizes: ['36', '37', '38', '39', '40', '41'], retailerSource: 'Saks', inStock: true },
  { _id: '10', name: 'Monolith Patent Leather Loafers', brand: 'Prada', category: 'Shoes', originalPrice: 1450, ourPrice: 995, discount: 31, images: ['https://picsum.photos/seed/prada2/600/800'], sizes: ['39', '40', '41', '42', '43'], retailerSource: 'Nordstrom', inStock: true },
  { _id: '11', name: 'Wyatt Harness Boots', brand: 'Saint Laurent', category: 'Shoes', originalPrice: 1495, ourPrice: 1049, discount: 30, images: ['https://picsum.photos/seed/ysl2/600/800'], sizes: ['40', '41', '42', '43'], retailerSource: 'Neiman Marcus', inStock: true },
  { _id: '12', name: 'Track Sneakers', brand: 'Balenciaga', category: 'Shoes', originalPrice: 895, ourPrice: 649, discount: 27, images: ['https://picsum.photos/seed/balenciaga2/600/800'], sizes: ['39', '40', '41', '42', '43', '44'], retailerSource: 'Saks', inStock: true },
  { _id: '13', name: 'Silk Crepe Blouse', brand: 'Gucci', category: 'Clothing', originalPrice: 1500, ourPrice: 999, discount: 33, images: ['https://picsum.photos/seed/gucci3/600/800'], sizes: ['XS', 'S', 'M', 'L'], retailerSource: 'Saks', inStock: true },
  { _id: '14', name: 'Re-Nylon Puffer Jacket', brand: 'Prada', category: 'Clothing', originalPrice: 2490, ourPrice: 1749, discount: 30, images: ['https://picsum.photos/seed/prada3/600/800'], sizes: ['S', 'M', 'L', 'XL'], retailerSource: 'Nordstrom', inStock: true },
  { _id: '15', name: 'Oversized Wool Blazer', brand: 'Saint Laurent', category: 'Clothing', originalPrice: 3290, ourPrice: 2299, discount: 30, images: ['https://picsum.photos/seed/ysl3/600/800'], sizes: ['36', '38', '40', '42', '44'], retailerSource: 'Neiman Marcus', inStock: true },
  { _id: '16', name: 'Double Breasted Coat', brand: 'Balenciaga', category: 'Clothing', originalPrice: 4590, ourPrice: 3199, discount: 30, images: ['https://picsum.photos/seed/balenciaga3/600/800'], sizes: ['S', 'M', 'L'], retailerSource: 'Saks', inStock: true },
  { _id: '17', name: 'GG Belt', brand: 'Gucci', category: 'Accessories', originalPrice: 450, ourPrice: 299, discount: 33, images: ['https://picsum.photos/seed/gucci4/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
  { _id: '18', name: 'Re-Edition 2005 Saffiano Card Holder', brand: 'Prada', category: 'Accessories', originalPrice: 340, ourPrice: 229, discount: 33, images: ['https://picsum.photos/seed/prada4/600/800'], sizes: ['One Size'], retailerSource: 'Nordstrom', inStock: true },
  { _id: '19', name: 'Monogram Belt', brand: 'Louis Vuitton', category: 'Accessories', originalPrice: 490, ourPrice: 349, discount: 29, images: ['https://picsum.photos/seed/lv1/600/800'], sizes: ['S', 'M', 'L'], retailerSource: 'Neiman Marcus', inStock: true },
  { _id: '20', name: 'Cashmere Scarf', brand: 'Burberry', category: 'Accessories', originalPrice: 490, ourPrice: 329, discount: 33, images: ['https://picsum.photos/seed/burberry1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
];

// GET /api/products - List products with filters
router.get('/', async (req, res) => {
  const { brand, category, priceMin, priceMax, size, sort = 'newest', page = '1', limit = '12' } = req.query;

  try {
    const products = await Product.find({}).lean();
    
    if (products.length === 0) {
      // Return mock data
      return getMockProducts(req, res);
    }

    let filtered = [...products];

    // Apply filters
    if (brand) {
      const brands = (brand as string).split(',');
      filtered = filtered.filter(p => brands.includes(p.brand));
    }

    if (category) {
      filtered = filtered.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
    }

    if (priceMin) {
      filtered = filtered.filter(p => p.ourPrice >= Number(priceMin));
    }

    if (priceMax) {
      filtered = filtered.filter(p => p.ourPrice <= Number(priceMax));
    }

    // Sort
    switch (sort) {
      case 'price-low':
        filtered.sort((a, b) => a.ourPrice - b.ourPrice);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.ourPrice - a.ourPrice);
        break;
      case 'discount':
        filtered.sort((a, b) => b.discount - a.discount);
        break;
      default:
        filtered.sort((a, b) => new Date(b.lastScraped).getTime() - new Date(a.lastScraped).getTime());
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      products: paginatedProducts,
      total,
      page: pageNum,
      totalPages,
    });
  } catch (error) {
    getMockProducts(req, res);
  }
});

// Helper function for mock products
function getMockProducts(req: express.Request, res: express.Response) {
  const { brand, category, priceMin, priceMax, sort = 'newest', page = '1', limit = '12' } = req.query;

  let filtered = [...mockProducts];

  if (brand) {
    const brands = (brand as string).split(',');
    filtered = filtered.filter(p => brands.includes(p.brand));
  }

  if (category) {
    filtered = filtered.filter(p => p.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (priceMin) {
    filtered = filtered.filter(p => p.ourPrice >= Number(priceMin));
  }

  if (priceMax) {
    filtered = filtered.filter(p => p.ourPrice <= Number(priceMax));
  }

  switch (sort) {
    case 'price-low':
      filtered.sort((a, b) => a.ourPrice - b.ourPrice);
      break;
    case 'price-high':
      filtered.sort((a, b) => b.ourPrice - a.ourPrice);
      break;
    case 'discount':
      filtered.sort((a, b) => b.discount - a.discount);
      break;
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedProducts = filtered.slice(startIndex, startIndex + limitNum);

  res.json({
    products: paginatedProducts,
    total,
    page: pageNum,
    totalPages,
  });
}

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id).lean();
    
    if (product) {
      return res.json(product);
    }

    // Check mock data
    const mockProduct = mockProducts.find(p => p._id === id);
    if (mockProduct) {
      return res.json({
        ...mockProduct,
        description: 'The small GG Marmont chain shoulder bag has a softly structured shape and an oversized flap closure with Double G hardware. The sliding chain strap can be worn multiple ways, changing between a shoulder and a top handle bag. Made in matelassé leather with a chevron design and GG on the back.',
        retailerUrl: 'https://saks.com',
      });
    }

    res.status(404).json({ error: 'Product not found' });
  } catch (error) {
    const mockProduct = mockProducts.find(p => p._id === id);
    if (mockProduct) {
      return res.json({
        ...mockProduct,
        description: 'The small GG Marmont chain shoulder bag has a softly structured shape and an oversized flap closure with Double G hardware.',
        retailerUrl: 'https://saks.com',
      });
    }
    res.status(404).json({ error: 'Product not found' });
  }
});

export default router;
