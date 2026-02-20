'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes: string[];
  retailerSource: string;
  retailerUrl: string;
  inStock: boolean;
}

export default function ProductDetail() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        return;
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    }
    // Fallback mock data
    setProduct({
      _id: params.id as string,
      name: 'GG Marmont Small Shoulder Bag',
      brand: 'Gucci',
      category: 'Bags',
      description: 'The small GG Marmont chain shoulder bag has a softly structured shape and an oversized flap closure with Double G hardware. The sliding chain strap can be worn multiple ways, changing between a shoulder and a top handle bag. Made in matelassé leather with a chevron design and GG on the back.',
      originalPrice: 2350,
      ourPrice: 1699,
      discount: 28,
      images: [
        'https://picsum.photos/seed/gucci1/800/1000',
        'https://picsum.photos/seed/gucci2/800/1000',
        'https://picsum.photos/seed/gucci3/800/1000',
        'https://picsum.photos/seed/gucci4/800/1000',
      ],
      sizes: ['One Size'],
      retailerSource: 'Saks',
      retailerUrl: 'https://saks.com',
      inStock: true,
    });
  };

  const handleAddToCart = async () => {
    if (!selectedSize && product?.sizes.length > 0) {
      alert('Please select a size');
      return;
    }
    setAdding(true);
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?._id,
          quantity,
          size: selectedSize || product?.sizes[0],
        }),
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAdding(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const savings = product.originalPrice - product.ourPrice;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray mb-8 font-inter">
          <Link href="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-black">Shop</Link>
          <span>/</span>
          <Link href={`/shop?category=${product.category.toLowerCase()}`} className="hover:text-black">{product.category}</Link>
          <span>/</span>
          <span className="text-black">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square overflow-hidden border-2 ${
                    selectedImage === i ? 'border-black' : 'border-transparent'
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-24 h-fit">
            <p className="text-gray text-sm tracking-widest mb-2 font-inter">{product.brand}</p>
            <h1 className="font-playfair text-3xl md:text-4xl mb-4">{product.name}</h1>
            
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-inter text-2xl font-semibold">${product.ourPrice.toLocaleString()}</span>
              <span className="price-original text-lg">${product.originalPrice.toLocaleString()}</span>
              <span className="discount-badge px-2 py-1 text-xs font-inter">
                -{product.discount}% OFF
              </span>
            </div>

            <p className="text-green-600 font-inter font-medium mb-2">
              You save ${savings.toLocaleString()}!
            </p>

            {/* Size Selector */}
            {product.sizes.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-inter mb-2">
                  Size: {selectedSize && <span className="text-gray">({selectedSize})</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border font-inter text-sm transition-colors ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-inter mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-black transition-colors"
                >
                  -
                </button>
                <span className="font-inter w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-black transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={adding || !product.inStock}
              className="w-full bg-black text-white py-4 font-inter text-sm tracking-widest hover:bg-charcoal transition-colors disabled:opacity-50 mb-4"
            >
              {adding ? 'ADDING...' : added ? 'ADDED TO CART!' : product.inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
            </button>

            <Link
              href="/cart"
              className="block w-full border border-black py-4 font-inter text-sm tracking-widest text-center hover:bg-black hover:text-white transition-colors"
            >
              VIEW CART
            </Link>

            {/* Retailer Tag */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray font-inter mb-2">Source: {product.retailerSource}</p>
              <a
                href={product.retailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:text-gray transition-colors"
              >
                View original listing →
              </a>
            </div>

            {/* Description */}
            <div className="mt-8">
              <h3 className="font-playfair text-lg mb-4">Description</h3>
              <p className="font-inter text-gray font-light leading-relaxed">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
