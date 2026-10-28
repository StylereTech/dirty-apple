'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import LoadError from '@/components/LoadError';
import { apiRequest, errorMessage } from '@/lib/api';
import { Product, ProductPage } from '@/lib/catalog';

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
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const featured = searchParams.get('featured') === 'true';
  const gender = searchParams.get('gender') || '';
  const onSale = searchParams.get('onSale') === 'true';

  // Sync URL params AFTER hydration — useState initializers run before searchParams are available
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const search = searchParams.get('search') || '';
    setSelectedCategory(cat);
    setSelectedBrands(brand ? brand.split(',').filter(Boolean) : []);
    setSearchQuery(search);
    setPage(1);
    setReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ sort: sortBy, page: String(page), limit: '12', inStock: 'true' });
    if (selectedBrands.length) params.set('brand', selectedBrands.join(','));
    if (selectedCategory) params.set('category', selectedCategory);
    if (priceRange[0] > 0) params.set('priceMin', String(priceRange[0]));
    if (priceRange[1] < 10000) params.set('priceMax', String(priceRange[1]));
    if (minDiscount > 0) params.set('minDiscount', String(minDiscount));
    if (searchQuery) params.set('search', searchQuery);
    if (featured) params.set('featured', 'true');
    if (gender) params.set('gender', gender);
    if (onSale) params.set('onSale', 'true');
    const timer = window.setTimeout(() => {
      apiRequest<ProductPage>(`/products?${params}`, { signal: controller.signal })
        .then(data => {
          if (controller.signal.aborted) return;
          setProducts(data.products); setTotal(data.total);
          setTotalPages(Math.max(1, data.totalPages));
          setBrands(data.brands || []); setCategories(data.categories || []);
        })
        .catch(err => { if (!controller.signal.aborted) { setError(errorMessage(err)); setProducts([]); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [selectedBrands, selectedCategory, priceRange, minDiscount, sortBy, page, searchQuery, ready, featured, gender, onSale, retry]);

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="bg-black text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="font-inter text-xs tracking-[0.3em] text-gray-500 mb-2">
            {selectedCategory ? selectedCategory.toUpperCase() : 'ALL PRODUCTS'}
          </p>
          <h1 className="font-playfair text-3xl md:text-5xl">
            {selectedCategory || (selectedBrands.length === 1 ? selectedBrands[0] : featured ? 'Featured' : gender ? `${gender[0].toUpperCase()}${gender.slice(1)}` : 'Shop All')}
          </h1>
          {/* Search bar */}
          <div className="mt-6 max-w-md">
            <input
              type="search"
              aria-label="Search products"
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
              brands={brands}
              categories={categories}
              selectedBrands={selectedBrands}
              selectedCategory={selectedCategory}
              priceRange={priceRange}
              minDiscount={minDiscount}
              onBrandChange={(b) => { setSelectedBrands(prev => prev.includes(b) ? prev.filter(x=>x!==b) : [...prev,b]); setPage(1); }}
              onCategoryChange={(c) => { setSelectedCategory(c); setPage(1); }}
              onPriceChange={(r) => { setPriceRange(r); setPage(1); }}
              onDiscountChange={(d) => { setMinDiscount(d); setPage(1); }}
              onClear={() => { setSelectedBrands([]); setSelectedCategory(''); setPriceRange([0,10000]); setMinDiscount(0); setSearchQuery(''); setPage(1); }}
            />
          </div>

          {/* Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500 font-inter text-sm">
                {loading ? 'Loading...' : error ? 'Products unavailable' : `${total} product${total !== 1 ? 's' : ''}`}
              </p>
              <select
                aria-label="Sort products"
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
            ) : error ? <LoadError message={error} onRetry={() => setRetry(r => r + 1)} /> : products.length === 0 ? (
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
            {!loading && !error && totalPages > 1 && (
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
