'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import FilterSidebar from '@/components/FilterSidebar';
import ProductCard from '@/components/ProductCard';

interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes: string[];
  retailerSource: string;
  inStock: boolean;
}

const brands = ['Gucci', 'Prada', 'Saint Laurent', 'Balenciaga', 'Bottega Veneta', 'Loewe', 'Celine', 'Chanel'];
const categories = ['Bags', 'Shoes', 'Clothing', 'Accessories'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'One Size'];

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [selectedBrands, selectedCategory, priceRange, selectedSizes, sortBy, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBrands.length) params.append('brand', selectedBrands.join(','));
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('priceMin', priceRange[0].toString());
      params.append('priceMax', priceRange[1].toString());
      if (selectedSizes.length) params.append('size', selectedSizes.join(','));
      params.append('sort', sortBy);
      params.append('page', page.toString());
      params.append('limit', '12');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Use mock data as fallback
      setProducts([
        { _id: '1', name: 'GG Marmont Small Shoulder Bag', brand: 'Gucci', category: 'Bags', originalPrice: 2350, ourPrice: 1699, discount: 28, images: ['https://picsum.photos/seed/gucci1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
        { _id: '2', name: 'Re-Edition 2005 Saffiano Leather Bag', brand: 'Prada', category: 'Bags', originalPrice: 1850, ourPrice: 1299, discount: 30, images: ['https://picsum.photos/seed/prada1/600/800'], sizes: ['One Size'], retailerSource: 'Nordstrom', inStock: true },
        { _id: '3', name: 'Loulou Small Bag in Quilted Leather', brand: 'Saint Laurent', category: 'Bags', originalPrice: 2590, ourPrice: 1899, discount: 27, images: ['https://picsum.photos/seed/ysl1/600/800'], sizes: ['One Size'], retailerSource: 'Neiman Marcus', inStock: true },
        { _id: '4', name: 'Le Cagole XS Shoulder Bag', brand: 'Balenciaga', category: 'Bags', originalPrice: 1890, ourPrice: 1299, discount: 31, images: ['https://picsum.photos/seed/balenciaga1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
        { _id: '5', name: 'Cassette Bag in Intrecciato', brand: 'Bottega Veneta', category: 'Bags', originalPrice: 3200, ourPrice: 2400, discount: 25, images: ['https://picsum.photos/seed/bv1/600/800'], sizes: ['One Size'], retailerSource: 'Nordstrom', inStock: true },
        { _id: '6', name: 'Pouch in Folded Leather', brand: 'Loewe', category: 'Bags', originalPrice: 1590, ourPrice: 1099, discount: 31, images: ['https://picsum.photos/seed/loewe1/600/800'], sizes: ['One Size'], retailerSource: 'Neiman Marcus', inStock: true },
        { _id: '7', name: 'Triomphe Bag in Shiny Calfskin', brand: 'Celine', category: 'Bags', originalPrice: 2900, ourPrice: 2100, discount: 28, images: ['https://picsum.photos/seed/celine1/600/800'], sizes: ['One Size'], retailerSource: 'Saks', inStock: true },
        { _id: '8', name: 'Classic Flap Bag Medium', brand: 'Chanel', category: 'Bags', originalPrice: 8200, ourPrice: 5999, discount: 27, images: ['https://picsum.photos/seed/chanel1/600/800'], sizes: ['Medium'], retailerSource: 'Neiman Marcus', inStock: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
    setPage(1);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <div className="bg-black text-white py-16 text-center">
        <h1 className="font-playfair text-4xl md:text-5xl mb-4">Shop All</h1>
        <p className="font-inter font-light text-gray-300">Discover luxury at uncovered prices</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <FilterSidebar
            brands={brands}
            categories={categories}
            sizes={sizes}
            selectedBrands={selectedBrands}
            selectedCategory={selectedCategory}
            selectedSizes={selectedSizes}
            priceRange={priceRange}
            onBrandChange={handleBrandChange}
            onCategoryChange={(cat) => { setSelectedCategory(cat); setPage(1); }}
            onSizeChange={handleSizeChange}
            onPriceChange={(range) => { setPriceRange(range); setPage(1); }}
          />

          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray font-inter font-light">
                {loading ? 'Loading...' : `${products.length} products`}
              </p>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="border border-gray-300 px-4 py-2 font-inter text-sm focus:outline-none focus:border-black"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="discount"> Biggest Discount</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200 mb-4"></div>
                    <div className="h-3 bg-gray-200 mb-2"></div>
                    <div className="h-4 bg-gray-200 mb-2"></div>
                    <div className="h-4 bg-gray-200 w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 disabled:opacity-50 hover:border-black transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 font-inter text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 disabled:opacity-50 hover:border-black transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
