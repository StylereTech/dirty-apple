'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import LoadError from '@/components/LoadError';
import { ApiError, apiRequest, cartRequest, errorMessage } from '@/lib/api';
import { Product, CartData, money, retailerLink } from '@/lib/catalog';

function deduplicateImages(images: string[]): string[] {
  const seen = new Set<string>();
  return images.filter(url => {
    const match = url.match(/sim\/[a-f0-9]{2}\/[a-f0-9]{2}\/([a-f0-9]+)/);
    const key = match ? match[1] : url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ProductDetail() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle');
  const [cartError, setCartError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setProduct(null); setError(''); setMissing(false);
    setSelectedImage(0); setSelectedSize(''); setQuantity(1); setAddState('idle'); setCartError('');
    async function load() {
      try {
        let data: Product;
        try {
          data = await apiRequest<Product>(`/products/slug/${encodeURIComponent(id)}`, { signal: controller.signal });
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404 || !/^[a-f\d]{24}$/i.test(id)) throw err;
          data = await apiRequest<Product>(`/products/${id}`, { signal: controller.signal });
        }
        if (!data._id || !data.name) throw new Error('Invalid product response');
        if (!controller.signal.aborted) setProduct(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setMissing(err instanceof ApiError && err.status === 404);
          setError(errorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id, retry]);

  const handleAddToCart = async () => {
    if (!product || product.purchaseMode === 'external' || product.inStock === false) return;
    setCartError('');
    if (product.sizes?.length && !product.sizes.some(s => s.size === selectedSize && s.available)) {
      setCartError('Choose an available size before adding this item.');
      return;
    }
    setAddState('adding');
    try {
      await cartRequest<CartData>('', {
        method: 'POST',
        body: JSON.stringify({ productId: product._id, quantity, size: selectedSize || 'One Size' }),
      });
      setAddState('added');
    } catch (err) {
      setCartError(errorMessage(err));
      setAddState('idle');
    }
  };

  if (loading) return <div className="min-h-screen pt-24 px-4" aria-label="Loading product"><div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12"><div className="aspect-[3/4] skeleton" /><div><div className="h-4 skeleton w-20 mb-3" /><div className="h-8 skeleton w-3/4 mb-4" /></div></div></div>;
  if (!product) return <div className="min-h-screen pt-32 px-4 max-w-3xl mx-auto text-center">{missing ? <><h1 className="font-playfair text-3xl mb-4">Product not available</h1><p className="text-gray-500 mb-6">This listing may have been removed or is no longer available.</p></> : <LoadError message={error || 'Unable to load this product.'} onRetry={() => setRetry(r => r + 1)} />}<Link href="/shop" className="inline-block mt-6 underline">Browse current products</Link></div>;

  const savings = Math.max(0, product.originalPrice - product.ourPrice);
  const images = deduplicateImages(product.images || []);
  const external = product.purchaseMode === 'external';
  const destination = retailerLink(product);
  const verifiedDate = product.lastVerifiedAt ? new Date(product.lastVerifiedAt) : null;
  const available = product.inStock !== false;

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-inter">
          <Link href="/" className="hover:text-black">Home</Link><span>/</span><Link href="/shop" className="hover:text-black">Shop</Link><span>/</span>
          <Link href={`/shop?category=${encodeURIComponent(product.category.toLowerCase())}`} className="hover:text-black">{product.category}</Link><span>/</span><span className="text-black truncate max-w-[200px]">{product.name}</span>
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-3">
            <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
              {images.length ? <img src={images[selectedImage] || images[0]} alt={product.name} className="w-full h-full object-contain bg-white p-4" /> : <p className="h-full flex items-center justify-center text-sm text-gray-500">Image unavailable</p>}
            </div>
            {images.length > 1 && <div className="grid grid-cols-4 gap-2">{images.map((img, i) => <button key={img} aria-label={`View image ${i + 1}`} onClick={() => setSelectedImage(i)} className={`relative aspect-square overflow-hidden ${selectedImage === i ? 'ring-2 ring-black' : 'ring-1 ring-gray-200'}`}><img src={img} alt="" className="w-full h-full object-contain bg-white" /></button>)}</div>}
          </div>
          <div className="lg:sticky lg:top-28 h-fit">
            <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-2">{product.brand.toUpperCase()}</p>
            <h1 className="font-playfair text-2xl md:text-3xl mb-6">{product.name}</h1>
            <div className="flex flex-wrap items-baseline gap-4 mb-2">
              <span className="font-inter text-2xl">{money(product.ourPrice, product.currency)}</span>
              {savings > 0 && <><span className="font-inter text-lg text-gray-400 line-through">{money(product.originalPrice, product.currency)}</span><span className="bg-black text-white px-2 py-0.5 font-inter text-xs">−{product.discount}%</span></>}
            </div>
            {savings > 0 && <p className="font-inter text-sm text-gray-500 mb-6">Save {money(savings, product.currency)}</p>}
            {external && <div className="font-inter text-sm text-gray-600 mb-6 space-y-2"><p>Sold by {product.retailerSource}.</p>{verifiedDate && !Number.isNaN(verifiedDate.getTime()) && <p className="text-xs">Last checked {verifiedDate.toLocaleString()}</p>}<p>Confirm the current price, size and availability at the retailer. Shipping and returns follow the retailer’s terms.</p></div>}
            {(product.finalSale || product.promotion) && <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{product.finalSale && <p className="font-medium">Final sale — check the retailer’s return restrictions.</p>}{product.promotion && <p className={product.finalSale ? "mt-2" : ""}>{product.promotion}</p>}</div>}
            {!external && <>
              {!!product.sizes?.length && <div className="mb-6"><p className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">SIZE</p><div className="flex flex-wrap gap-2">{product.sizes.map(s => <button key={s.size} onClick={() => { setSelectedSize(s.size); setAddState('idle'); }} disabled={!s.available} aria-pressed={selectedSize === s.size} className={`min-w-[48px] px-3 py-2 border font-inter text-sm ${selectedSize === s.size ? 'border-black bg-black text-white' : s.available ? 'border-gray-300 hover:border-black' : 'border-gray-200 text-gray-300 line-through'}`}>{s.size}</button>)}</div></div>}
              <div className="mb-8"><p className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">QUANTITY</p><div className="flex items-center"><button aria-label="Decrease quantity" onClick={() => { setQuantity(q => Math.max(1, q - 1)); setAddState('idle'); }} disabled={quantity === 1} className="w-10 h-10 border border-gray-300 disabled:opacity-40">−</button><span className="w-12 h-10 border-y border-gray-300 flex items-center justify-center font-inter text-sm">{quantity}</span><button aria-label="Increase quantity" onClick={() => { setQuantity(q => Math.min(10, q + 1)); setAddState('idle'); }} disabled={quantity === 10} className="w-10 h-10 border border-gray-300 disabled:opacity-40">+</button></div></div>
            </>}
            {external ? (destination && available ? <a href={destination} target="_blank" rel={product.affiliateUrl ? 'sponsored noopener noreferrer' : 'noopener noreferrer'} className="block w-full bg-black text-white py-4 text-center font-inter text-xs tracking-[0.2em]">VIEW AT {product.retailerSource.toUpperCase()} ↗</a> : <p className="border border-gray-200 p-4 text-sm text-gray-500">{available ? 'Retailer link is currently unavailable.' : 'This item is currently unavailable.'}</p>) : <><button onClick={handleAddToCart} disabled={addState !== 'idle' || !available} className="w-full bg-black text-white py-4 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800 disabled:opacity-50 mb-3">{addState === 'adding' ? 'ADDING...' : addState === 'added' ? '✓ ADDED TO CART' : available ? 'ADD TO CART' : 'OUT OF STOCK'}</button>{cartError && <p role="alert" className="text-red-700 text-sm mb-3">{cartError}</p>}<Link href="/cart" className="block w-full border border-black py-4 font-inter text-xs tracking-[0.2em] text-center">VIEW CART</Link></>}
            {external && product.affiliateUrl && <p className="text-xs text-gray-500 mt-3">Dirty Apple may earn a commission when you buy through this link.</p>}
            <div className="mt-10 pt-8 border-t border-gray-200"><h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">DESCRIPTION</h2><p className="font-inter text-sm text-gray-600 leading-relaxed">{product.description || 'See the retailer for full product details.'}</p></div>
          </div>
        </div>
        {!!product.related?.length && <section className="mt-20 mb-16"><h2 className="font-playfair text-2xl mb-8">You May Also Like</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-5">{product.related.map(p => <ProductCard key={p._id} product={p} />)}</div></section>}
      </div>
    </div>
  );
}
