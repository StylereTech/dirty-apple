'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://dirty-apple-api-production.up.railway.app';

const collectionMeta: Record<string, { title: string; description: string }> = {
  'editors-picks': { title: "Editor's Picks", description: 'Hand-selected by our style team — the pieces worth investing in.' },
  'trending': { title: 'Trending Now', description: 'The most coveted pieces this season. Don\'t miss out.' },
  'sale': { title: 'Sale', description: 'Luxury at exceptional prices. Up to 40% off select styles.' },
};

interface Product {
  _id: string; name: string; slug: string; brand: string; category: string;
  originalPrice: number; ourPrice: number; discount: number; images: string[];
  sizes: { size: string; available: boolean }[]; retailerSource: string;
  inStock: boolean; featured: boolean;
}

export default function CollectionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const meta = collectionMeta[slug] || { title: slug, description: '' };
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/products/collections/${slug}?sort=${sortBy}&limit=24`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, sortBy]);

  return (
    <div className="min-h-screen pt-20">
      <div className="bg-black text-white py-16 px-4 text-center">
        <p className="font-inter text-xs tracking-[0.3em] text-gray-500 mb-3">COLLECTION</p>
        <h1 className="font-playfair text-4xl md:text-6xl mb-4">{meta.title}</h1>
        <p className="font-inter text-sm text-gray-400 max-w-lg mx-auto">{meta.description}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <p className="text-gray-500 font-inter text-sm">
            {loading ? 'Loading...' : `${products.length} piece${products.length !== 1 ? 's' : ''}`}
          </p>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="border border-gray-300 px-4 py-2 font-inter text-xs tracking-wider focus:outline-none focus:border-black bg-white">
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="discount">Biggest Discount</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}><div className="aspect-[3/4] skeleton mb-3"></div><div className="h-3 skeleton w-20 mb-2"></div><div className="h-4 skeleton w-3/4"></div></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-playfair text-2xl mb-3">Coming Soon</p>
            <p className="text-gray-500 font-inter text-sm mb-6">This collection is being curated.</p>
            <Link href="/shop" className="inline-block border border-black px-8 py-3 font-inter text-xs tracking-[0.2em] hover:bg-black hover:text-white transition-colors">
              SHOP ALL
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
