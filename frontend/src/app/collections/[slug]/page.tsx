'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import LoadError from '@/components/LoadError';
import { apiRequest, errorMessage } from '@/lib/api';
import { Product, ProductPage } from '@/lib/catalog';

const collectionMeta: Record<string, { title: string; description: string }> = {
  'editors-picks': { title: "Editor's Picks", description: 'A curated selection of standout pieces.' },
  'trending': { title: 'Trending Deals', description: 'Discover significant markdowns from our current listings.' },
  'sale': { title: 'Sale', description: 'Explore current sale and discount listings. Prices and availability can change.' },
  'new-arrivals': { title: 'New Arrivals', description: 'The latest additions to Dirty Apple.' },
};

export default function CollectionPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const meta = collectionMeta[slug] || { title: slug.replace(/-/g, ' '), description: '' };
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => { setPage(1); }, [slug]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    apiRequest<ProductPage>(`/products/collections/${encodeURIComponent(slug)}?sort=${sortBy}&page=${page}&limit=24`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setProducts(data.products); setTotal(data.total); setTotalPages(Math.max(1, data.totalPages)); } })
      .catch(err => { if (!controller.signal.aborted) { setProducts([]); setError(errorMessage(err)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, sortBy, page, retry]);

  return (
    <div className="min-h-screen pt-20">
      <div className="bg-black text-white py-16 px-4 text-center"><p className="font-inter text-xs tracking-[0.3em] text-gray-500 mb-3">COLLECTION</p><h1 className="font-playfair text-4xl md:text-6xl mb-4">{meta.title}</h1><p className="font-inter text-sm text-gray-400 max-w-lg mx-auto">{meta.description}</p></div>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8"><p className="text-gray-500 font-inter text-sm">{loading ? 'Loading...' : error ? 'Products unavailable' : `${total} piece${total !== 1 ? 's' : ''}`}</p><select aria-label="Sort collection" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className="border border-gray-300 px-4 py-2 font-inter text-xs tracking-wider focus:outline-none focus:border-black bg-white"><option value="newest">Newest</option><option value="price-low">Price: Low → High</option><option value="price-high">Price: High → Low</option><option value="discount">Biggest Discount</option></select></div>
        {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{Array.from({ length: 8 }).map((_, i) => <div key={i}><div className="aspect-[3/4] skeleton mb-3" /><div className="h-3 skeleton w-20 mb-2" /><div className="h-4 skeleton w-3/4" /></div>)}</div> : error ? <LoadError message={error} onRetry={() => setRetry(r => r + 1)} /> : products.length === 0 ? <div className="text-center py-20"><p className="font-playfair text-2xl mb-3">No current listings</p><p className="text-gray-500 font-inter text-sm mb-6">Check back as new items are added.</p><Link href="/shop" className="inline-block border border-black px-8 py-3 font-inter text-xs tracking-[0.2em] hover:bg-black hover:text-white transition-colors">SHOP ALL</Link></div> : <div className="grid grid-cols-2 md:grid-cols-4 gap-5">{products.map(p => <ProductCard key={p._id} product={p} />)}</div>}
        {!loading && !error && totalPages > 1 && <nav aria-label="Collection pagination" className="flex justify-center items-center gap-4 mt-12"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-5 py-2 border border-gray-300 font-inter text-xs tracking-wider disabled:opacity-30 hover:border-black transition-colors">PREV</button><span className="font-inter text-sm text-gray-500">{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-5 py-2 border border-gray-300 font-inter text-xs tracking-wider disabled:opacity-30 hover:border-black transition-colors">NEXT</button></nav>}
      </div>
    </div>
  );
}
