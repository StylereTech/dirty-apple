'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import Link from 'next/link';
import ProductCard from '@/components/ProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Product {
  _id: string; name: string; slug: string; brand: string; category: string;
  description: string; originalPrice: number; ourPrice: number; discount: number;
  images: string[]; sizes: { size: string; available: boolean }[];
  retailerSource: string; retailerUrl: string; inStock: boolean;
  related?: Product[];
}

export default function ProductDetail() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle');

  useEffect(() => {
    const id = params.id as string;
    setLoading(true);
    // Try slug first, then ID
    fetch(`${API}/api/products/slug/${id}`)
      .then(r => r.ok ? r.json() : fetch(`${API}/api/products/${id}`).then(r2 => r2.json()))
      .then(data => { setProduct(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleAddToCart = async () => {
    if (!selectedSize && product?.sizes?.length) {
      const avail = product.sizes.find(s => s.available);
      if (!avail) return;
      setSelectedSize(avail.size);
    }
    setAddState('adding');
    try {
      await fetch(`${API}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?._id,
          quantity,
          size: selectedSize || product?.sizes?.[0]?.size || 'One Size',
          name: product?.name,
          brand: product?.brand,
          image: product?.images?.[0],
          price: product?.ourPrice,
          originalPrice: product?.originalPrice,
        }),
      });
      setAddState('added');
      setTimeout(() => setAddState('idle'), 2000);
    } catch {
      setAddState('idle');
    }
  };

  if (loading || !product) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-[3/4] skeleton"></div>
          <div><div className="h-4 skeleton w-20 mb-3"></div><div className="h-8 skeleton w-3/4 mb-4"></div><div className="h-6 skeleton w-1/3"></div></div>
        </div>
      </div>
    );
  }

  const savings = product.originalPrice - product.ourPrice;

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-inter">
          <Link href="/" className="hover:text-black">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-black">Shop</Link><span>/</span>
          <Link href={`/shop?category=${product.category.toLowerCase()}`} className="hover:text-black">{product.category}</Link><span>/</span>
          <span className="text-black truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              {/* Source badge */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 font-inter text-xs text-gray-600">
                via {product.retailerSource}
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`relative aspect-square overflow-hidden ${selectedImage === i ? 'ring-2 ring-black' : 'ring-1 ring-gray-200'}`}>
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-28 h-fit">
            <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-2">{product.brand.toUpperCase()}</p>
            <h1 className="font-playfair text-2xl md:text-3xl mb-6">{product.name}</h1>

            <div className="flex items-baseline gap-4 mb-2">
              <span className="font-inter text-2xl">${product.ourPrice.toLocaleString()}</span>
              <span className="font-inter text-lg text-gray-400 line-through">${product.originalPrice.toLocaleString()}</span>
              <span className="bg-black text-white px-2 py-0.5 font-inter text-xs">−{product.discount}%</span>
            </div>
            <p className="font-inter text-sm text-gray-500 mb-8">You save ${savings.toLocaleString()}</p>

            {/* Sizes */}
            {product.sizes?.length > 0 && (
              <div className="mb-6">
                <p className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s.size} onClick={() => s.available && setSelectedSize(s.size)}
                      disabled={!s.available}
                      className={`min-w-[48px] px-3 py-2 border font-inter text-sm transition-colors
                        ${selectedSize === s.size ? 'border-black bg-black text-white' : s.available ? 'border-gray-300 hover:border-black' : 'border-gray-200 text-gray-300 cursor-not-allowed line-through'}`}>
                      {s.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <p className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">QUANTITY</p>
              <div className="flex items-center">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-black text-lg">−</button>
                <span className="w-12 h-10 border-y border-gray-300 flex items-center justify-center font-inter text-sm">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-black text-lg">+</button>
              </div>
            </div>

            {/* Actions */}
            <button onClick={handleAddToCart} disabled={addState !== 'idle' || !product.inStock}
              className="w-full bg-black text-white py-4 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800 transition-colors disabled:opacity-50 mb-3">
              {addState === 'adding' ? 'ADDING...' : addState === 'added' ? '✓ ADDED TO CART' : product.inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
            </button>
            <Link href="/cart" className="block w-full border border-black py-4 font-inter text-xs tracking-[0.2em] text-center hover:bg-black hover:text-white transition-colors">
              VIEW CART
            </Link>

            {/* Details */}
            <div className="mt-10 pt-8 border-t border-gray-200 space-y-6">
              <div>
                <h3 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">DESCRIPTION</h3>
                <p className="font-inter text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
              <div>
                <h3 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">SOURCE</h3>
                <p className="font-inter text-sm text-gray-600 mb-1">Available at {product.retailerSource}</p>
                <a href={product.retailerUrl} target="_blank" rel="noopener noreferrer"
                  className="font-inter text-xs text-gray-400 hover:text-black underline">View original listing →</a>
              </div>
              <div>
                <h3 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-3">SHIPPING</h3>
                <p className="font-inter text-sm text-gray-600">Free shipping on orders over $500. Standard delivery 5-7 business days.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {product.related && product.related.length > 0 && (
          <section className="mt-20 mb-16">
            <h2 className="font-playfair text-2xl mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {product.related.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
