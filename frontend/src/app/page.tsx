'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { name: 'Bags',        slug: 'bags',        image: '/cat-bags.jpg' },
  { name: 'Shoes',       slug: 'shoes',       image: '/cat-shoes.jpg' },
  { name: 'Clothing',    slug: 'clothing',    image: '/cat-clothing.jpg' },
  { name: 'Accessories', slug: 'accessories', image: '/cat-accessories.jpg' },
];

const BRANDS = [
  'Saint Laurent', 'Gucci', 'Prada', 'Valentino', 'Burberry', 'Amiri',
  'Off-White', 'Balenciaga', 'Dior', 'Givenchy', 'Versace', 'Fendi',
  'Bottega Veneta', 'Loewe', 'Moncler', 'Tom Ford',
];

const TICKER_ITEMS = [
  'SAINT LAURENT', 'GUCCI', 'PRADA', 'VALENTINO', 'BURBERRY', 'AMIRI',
  'OFF-WHITE', 'BALENCIAGA', 'DIOR', 'UP TO 70% OFF', 'FREE RETURNS', 'SAME-DAY DELIVERY',
];

export default function HomePage() {
  const [featured, setFeatured] = useState<any[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://dirty-apple-api-production.up.railway.app';

  useEffect(() => {
    fetch(`${API}/api/products?featured=true&limit=4&sort=price-low`)
      .then(r => r.json())
      .then(d => setFeatured(d.products || []))
      .catch(() => {});
  }, []);

  const fmt = (n: number) =>
    Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes tickerSlow {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker 28s linear infinite;
        }
        .ticker-track-slow {
          display: flex;
          width: max-content;
          animation: tickerSlow 45s linear infinite;
        }
        .ticker-track:hover,
        .ticker-track-slow:hover { animation-play-state: paused; }

        @keyframes heroFade {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-line-1 { opacity: 0; animation: heroFade 1s ease 0.2s forwards; }
        .hero-line-2 { opacity: 0; animation: heroFade 1s ease 0.5s forwards; }
        .hero-cta    { opacity: 0; animation: heroFade 1s ease 0.8s forwards; }
      `}</style>

      <main className="bg-black min-h-screen">

        {/* ── HERO ── */}
        <section className="relative h-screen w-full overflow-hidden">
          <img
            src="/hero-bg.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Gradient overlay — heavy at bottom, light at top */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/85" />

          <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 md:pb-28 px-4 text-center">
            <p className="hero-line-1 font-inter text-[10px] tracking-[0.45em] text-white/60 mb-5 uppercase">
              Luxury Resale · Redefined
            </p>
            <h1 className="hero-line-2 font-playfair text-[72px] md:text-[110px] lg:text-[140px] text-white leading-[0.9] tracking-tight mb-10">
              DIRTY<br />APPLE
            </h1>
            <div className="hero-cta flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="bg-white text-black px-12 py-4 font-inter text-[11px] tracking-[0.3em] hover:bg-gray-100 transition-colors uppercase"
              >
                Shop Now
              </Link>
              <Link
                href="/collections/sale"
                className="border border-white/50 text-white px-12 py-4 font-inter text-[11px] tracking-[0.3em] hover:bg-white/10 transition-colors uppercase"
              >
                View Deals
              </Link>
            </div>
          </div>
        </section>

        {/* ── TICKER BAND ── */}
        <div className="bg-white py-3 overflow-hidden border-y border-gray-100">
          <div className="ticker-track">
            {[0, 1].map(i => (
              <span key={i} className="flex items-center shrink-0">
                {TICKER_ITEMS.map(item => (
                  <span key={item + i} className="flex items-center shrink-0">
                    <span className="font-inter text-[10px] tracking-[0.3em] text-black whitespace-nowrap px-5 uppercase">
                      {item}
                    </span>
                    <span className="text-gray-300 text-xs">✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ── SHOP BY CATEGORY ── */}
        <section className="px-4 md:px-8 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <p className="font-inter text-[10px] tracking-[0.5em] text-white/30 uppercase mb-3">Explore</p>
              <h2 className="font-playfair text-4xl md:text-6xl text-white">The Edit</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/shop?category=${cat.slug}`}
                  className="group relative aspect-[3/4] overflow-hidden"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    style={{ transition: 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94)' }}
                  />
                  {/* Dark vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500" />

                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                    <p className="font-playfair text-xl md:text-2xl text-white tracking-wide">
                      {cat.name}
                    </p>
                    <p
                      className="font-inter text-[9px] tracking-[0.3em] text-white/0 group-hover:text-white/70 mt-1.5 uppercase transition-colors duration-300"
                    >
                      Shop Now →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── EDITORIAL SPLIT ── */}
        <section className="px-4 md:px-8 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

              {/* Women's */}
              <Link href="/shop?gender=women" className="group relative overflow-hidden aspect-[3/4]">
                <img
                  src="/editorial-collage.jpg"
                  alt="Women's Edit"
                  className="w-full h-full object-cover"
                  style={{ transition: 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                  <p className="font-inter text-[9px] tracking-[0.45em] text-white/50 uppercase mb-2">
                    The Women's Edit
                  </p>
                  <h3 className="font-playfair text-3xl md:text-[42px] text-white leading-tight mb-5">
                    Dressed to<br />Dominate
                  </h3>
                  <span className="inline-flex items-center gap-2 font-inter text-[10px] tracking-[0.3em] text-white uppercase border-b border-white/40 pb-0.5 group-hover:border-white transition-colors duration-300">
                    Shop Women
                  </span>
                </div>
              </Link>

              {/* Men's */}
              <Link href="/shop?gender=men" className="group relative overflow-hidden aspect-[3/4]">
                <img
                  src="/editorial-mens.jpg"
                  alt="Men's Edit"
                  className="w-full h-full object-cover"
                  style={{ transition: 'transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                  <p className="font-inter text-[9px] tracking-[0.45em] text-white/50 uppercase mb-2">
                    The Men's Edit
                  </p>
                  <h3 className="font-playfair text-3xl md:text-[42px] text-white leading-tight mb-5">
                    Effortless.<br />Sharp. Real.
                  </h3>
                  <span className="inline-flex items-center gap-2 font-inter text-[10px] tracking-[0.3em] text-white uppercase border-b border-white/40 pb-0.5 group-hover:border-white transition-colors duration-300">
                    Shop Men
                  </span>
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* ── FEATURED DROPS ── */}
        {featured.length > 0 && (
          <section className="bg-neutral-950 px-4 md:px-8 py-24">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-14">
                <div>
                  <p className="font-inter text-[10px] tracking-[0.5em] text-white/25 uppercase mb-3">Handpicked</p>
                  <h2 className="font-playfair text-4xl md:text-5xl text-white">Featured Drops</h2>
                </div>
                <Link
                  href="/shop?featured=true"
                  className="font-inter text-[10px] tracking-[0.25em] text-white/40 hover:text-white transition-colors uppercase border-b border-white/20 hover:border-white/60 pb-0.5"
                >
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {featured.map((p: any) => (
                  <Link key={p._id} href={`/product/${p._id}`} className="group">
                    <div className="aspect-[3/4] overflow-hidden bg-white border border-gray-100 mb-3 relative">
                      <img
                        src={p.images?.[0] || '/cat-clothing.jpg'}
                        alt={p.name}
                        className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      />
                      {p.discount > 0 && (
                        <span className="absolute top-3 left-3 font-inter text-[9px] tracking-[0.15em] bg-white text-black px-2 py-1">
                          -{p.discount}%
                        </span>
                      )}
                    </div>
                    <p className="font-inter text-[9px] tracking-[0.25em] text-white/30 uppercase mb-1">
                      {p.brand}
                    </p>
                    <p className="font-inter text-sm text-white mb-2 truncate">{p.name}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-inter text-sm text-white">${fmt(p.ourPrice)}</span>
                      {p.originalPrice && (
                        <span className="font-inter text-xs text-white/25 line-through">
                          ${fmt(p.originalPrice)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BRAND MARQUEE ── */}
        <section className="py-20 border-t border-white/8 overflow-hidden">
          <p className="font-inter text-[9px] tracking-[0.5em] text-white/15 text-center uppercase mb-10">
            Brands We Carry
          </p>
          <div className="ticker-track-slow">
            {[0, 1].map(i => (
              <span key={i} className="flex items-center shrink-0">
                {BRANDS.map(b => (
                  <span
                    key={b + i}
                    className="font-playfair text-2xl md:text-3xl text-white/15 hover:text-white/50 whitespace-nowrap px-8 transition-colors duration-300 cursor-default"
                  >
                    {b}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section className="py-36 px-4 text-center border-t border-white/8">
          <p className="font-inter text-[10px] tracking-[0.5em] text-white/25 uppercase mb-5">
            Luxury For Less
          </p>
          <h2 className="font-playfair text-5xl md:text-7xl lg:text-8xl text-white leading-tight mb-10">
            The Drop<br />Doesn't Wait.
          </h2>
          <Link
            href="/shop"
            className="inline-block bg-white text-black px-16 py-5 font-inter text-[11px] tracking-[0.35em] hover:bg-gray-100 transition-colors uppercase"
          >
            Shop the Collection
          </Link>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-white/8 py-14 px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="font-playfair text-2xl text-white tracking-wide">Dirty Apple</p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              {[
                { label: 'Shop',        href: '/shop' },
                { label: 'Bags',        href: '/shop?category=bags' },
                { label: 'Shoes',       href: '/shop?category=shoes' },
                { label: 'Clothing',    href: '/shop?category=clothing' },
                { label: 'Accessories', href: '/shop?category=accessories' },
                { label: 'Sale',        href: '/collections/sale' },
              ].map(l => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="font-inter text-[10px] tracking-[0.25em] text-white/30 hover:text-white transition-colors uppercase"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <p className="font-inter text-[10px] text-white/15">© 2026 Dirty Apple</p>
          </div>
        </footer>

      </main>
    </>
  );
}
