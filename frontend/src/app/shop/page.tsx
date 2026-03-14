'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://dirty-apple-api-production.up.railway.app';

interface Product {
  _id: string; name: string; slug: string; brand: string; category: string;
  originalPrice: number; ourPrice: number; discount: number; images: string[];
  sizes: { size: string; available: boolean }[]; retailerSource: string;
  inStock: boolean; featured: boolean;
}

function ShopInner() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [sortBy, setSortBy] = useState('price-low');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [ready, setReady] = useState(false);

  // Sync URL params AFTER hydration — useState initializers run before searchParams are available
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const search = searchParams.get('search') || '';
    setSelectedCategory(cat);
    if (brand) setSelectedBrands([brand]);
    if (search) setSearchQuery(search);
    setReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;
    fetchProducts();
  }, [selectedBrands, selectedCategory, priceRange, minDiscount, sortBy, page, searchQuery, ready]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBrands.length) params.append('brand', selectedBrands.join(','));
      if (selectedCategory) params.append('category', selectedCategory);
      if (priceRange[0] > 0) params.append('priceMin', priceRange[0].toString());
      if (priceRange[1] < 10000) params.append('priceMax', priceRange[1].toString());
      if (minDiscount > 0) params.append('minDiscount', minDiscount.toString());
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort', sortBy);
      params.append('page', page.toString());
      params.append('limit', '12');

      const res = await fetch(`${API}/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.brands) setBrands(data.brands);
      if (data.categories) setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="bg-black text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="font-inter text-xs tracking-[0.3em] text-gray-500 mb-2">
            {selectedCategory ? selectedCategory.toUpperCase() : 'ALL PRODUCTS'}
          </p>
          <h1 className="font-playfair text-3xl md:text-5xl">
            {selectedCategory || (selectedBrands.length === 1 ? selectedBrands[0] : 'Shop All')}
          </h1>
          {/* Search bar */}
          <div className="mt-6 max-w-md">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-transparent border border-gray-700 text-white px-4 py-3 font-inter text-sm placeholder:text-gray-600 focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mobile filter toggle */}
        <button
          onClick={() => setMobileFilters(!mobileFilters)}
          className="lg:hidden w-full border border-gray-300 py-3 font-inter text-xs tracking-[0.2em] mb-6"
        >
          {mobileFilters ? 'HIDE FILTERS' : 'SHOW FILTERS'}
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className={`${mobileFilters ? 'block' : 'hidden'} lg:block`}>
            <FilterSidebar
              brands={brands.length ? brands : ['Gucci','Prada','Saint Laurent','Balenciaga','Bottega Veneta','Burberry','Versace','Off-White','Celine','Dior','Loewe','Valentino']}
              categories={categories.length ? categories : ['Bags','Shoes','Clothing','Accessories']}
              selectedBrands={selectedBrands}
              selectedCategory={selectedCategory}
              priceRange={priceRange}
              minDiscount={minDiscount}
              onBrandChange={(b) => { setSelectedBrands(prev => prev.includes(b) ? prev.filter(x=>x!==b) : [...prev,b]); setPage(1); }}
              onCategoryChange={(c) => { setSelectedCategory(c); setPage(1); }}
              onPriceChange={(r) => { setPriceRange(r); setPage(1); }}
              onDiscountChange={(d) => { setMinDiscount(d); setPage(1); }}
              onClear={() => { setSelectedBrands([]); setSelectedCategory(''); setPriceRange([0,10000]); setMinDiscount(0); setPage(1); }}
            />
          </div>

          {/* Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500 font-inter text-sm">
                {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''}`}
              </p>
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setPage(1); }}
                className="border border-gray-300 px-4 py-2 font-inter text-xs tracking-wider focus:outline-none focus:border-black bg-white"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="discount">Biggest Discount</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[3/4] skeleton mb-3"></div>
                    <div className="h-3 skeleton w-16 mb-2"></div>
                    <div className="h-4 skeleton w-3/4 mb-2"></div>
                    <div className="h-4 skeleton w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-playfair text-2xl mb-3">No products found</p>
                <p className="text-gray-500 font-inter text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {products.map(p => <ProductCard key={p._id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-5 py-2 border border-gray-300 font-inter text-xs tracking-wider disabled:opacity-30 hover:border-black transition-colors"
                >
                  PREV
                </button>
                <span className="font-inter text-sm text-gray-500">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-5 py-2 border border-gray-300 font-inter text-xs tracking-wider disabled:opacity-30 hover:border-black transition-colors"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="font-inter text-sm text-gray-400">Loading...</p>
      </div>
    }>
      <ShopInner />
    </Suspense>
  );
}
