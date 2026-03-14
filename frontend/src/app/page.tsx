'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const collections = [
  { name: 'Editor\'s Picks', slug: 'editors-picks', description: 'Curated by our style team' },
  { name: 'Trending Now', slug: 'trending', description: 'Most wanted this week' },
  { name: 'Sale', slug: 'sale', description: 'Up to 40% off' },
];

const brandNames = [
  'Saint Laurent', 'Gucci', 'Prada', 'Balenciaga', 'Bottega Veneta',
  'Burberry', 'Moncler', 'Givenchy', 'Valentino', 'Balmain',
  'Brunello Cucinelli', 'Amiri', 'Palm Angels', 'Zimmermann',
  'Dolce & Gabbana', 'Zegna', 'Khaite', 'Stella McCartney',
];

const categories = [
  { name: 'Bags', slug: 'bags', image: '/cat-bags.jpg' },
  { name: 'Shoes', slug: 'shoes', image: '/cat-shoes.jpg' },
  { name: 'Clothing', slug: 'clothing', image: '/cat-clothing.jpg' },
  { name: 'Accessories', slug: 'accessories', image: '/cat-accessories.jpg' },
];

interface Product {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes: { size: string; available: boolean }[];
  retailerSource: string;
  inStock: boolean;
  featured: boolean;
}

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/products?featured=true&limit=8`)
      .then(r => r.json()).then(d => setFeatured(d.products || [])).catch(() => {});
    fetch(`${API}/api/products/deals`)
      .then(r => r.json()).then(d => setDeals(d || [])).catch(() => {});
  }, []);

  const scroll = (dir: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center bg-black text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <img src="/hero-bg.jpg" alt="" className="w-full h-full object-cover object-top" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <p className="font-inter text-xs tracking-[0.4em] mb-6 text-gray-400">CURATED LUXURY</p>
          <div className="mb-6">
            <img src="/dirty-apple-logo.png" alt="Dirty Apple" className="mx-auto h-24 md:h-36 w-auto object-contain mix-blend-multiply" />
          </div>
          <p className="font-inter text-lg md:text-xl font-light tracking-wide mb-10 text-gray-300">
            Luxury fashion. Uncovered prices.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/shop" className="bg-white text-black px-10 py-4 font-inter text-xs tracking-[0.2em] hover:bg-gray-200 transition-colors">
              SHOP NOW
            </Link>
            <Link href="/collections/sale" className="border border-white/50 text-white px-10 py-4 font-inter text-xs tracking-[0.2em] hover:bg-white/10 transition-colors">
              VIEW SALE
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Featured Products Carousel */}
      {featured.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-2">HAND-PICKED</p>
                <h2 className="font-playfair text-3xl md:text-4xl">Featured</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => scroll(-1)} className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-black transition-colors">←</button>
                <button onClick={() => scroll(1)} className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-black transition-colors">→</button>
              </div>
            </div>
            <div ref={carouselRef} className="carousel-container flex gap-5 overflow-x-auto pb-4">
              {featured.map(p => (
                <div key={p._id} className="carousel-item flex-shrink-0 w-[280px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-20 px-4 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-2 text-center">EXPLORE</p>
          <h2 className="font-playfair text-3xl md:text-4xl text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(cat => (
              <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className="group relative aspect-[3/4] overflow-hidden">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 flex items-end p-6">
                  <span className="text-white font-inter text-sm tracking-[0.2em]">{cat.name.toUpperCase()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Deals */}
      {deals.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-10">
              <div>
                <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-2">UP TO 35% OFF</p>
                <h2 className="font-playfair text-3xl md:text-4xl">Trending Deals</h2>
              </div>
              <Link href="/collections/sale" className="font-inter text-xs tracking-[0.2em] border-b border-black pb-1 hover:text-gray-600 transition-colors">
                VIEW ALL
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {deals.slice(0, 8).map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collections */}
      <section className="py-20 px-4 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <p className="font-inter text-xs tracking-[0.3em] text-gray-500 mb-2 text-center">CURATED</p>
          <h2 className="font-playfair text-3xl md:text-4xl text-center mb-12">Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {collections.map(col => (
              <Link key={col.slug} href={`/collections/${col.slug}`} className="group border border-gray-800 p-8 hover:border-gray-600 transition-colors">
                <h3 className="font-playfair text-xl mb-2">{col.name}</h3>
                <p className="font-inter text-sm text-gray-500 mb-6">{col.description}</p>
                <span className="font-inter text-xs tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
                  EXPLORE →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Logos */}
      <section className="py-16 px-4 bg-neutral-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-8 text-center">BRANDS WE CARRY</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {brandNames.map(b => (
              <Link key={b} href={`/shop?brand=${b}`} className="brand-logo font-playfair text-lg md:text-xl text-gray-400 hover:text-black transition-all whitespace-nowrap">
                {b}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { n: '01', title: 'We Source', desc: 'Our algorithms scan top luxury retailers daily to find the best prices on authenticated items.' },
              { n: '02', title: 'We Verify', desc: 'Every item is authenticated and quality-checked before listing on our platform.' },
              { n: '03', title: 'You Save', desc: 'Get luxury at up to 40% off retail prices, delivered to your door.' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-4">{s.n}</p>
                <h3 className="font-playfair text-xl mb-3">{s.title}</h3>
                <p className="font-inter text-gray-500 font-light text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
