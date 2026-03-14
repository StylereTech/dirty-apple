'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const transparent = isHome && !scrolled && !menuOpen;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          transparent
            ? 'bg-transparent'
            : 'bg-white border-b border-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`lg:hidden transition-colors ${transparent ? 'text-white' : 'text-black'}`}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* Left links */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { href: '/shop',               label: 'Shop' },
              { href: '/shop?category=bags', label: 'Bags' },
              { href: '/shop?category=shoes',label: 'Shoes' },
              { href: '/collections/sale',   label: 'Sale' },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-inter text-[11px] tracking-[0.18em] uppercase transition-colors duration-300 ${
                  transparent
                    ? 'text-white/80 hover:text-white'
                    : 'text-black/60 hover:text-black'
                } ${pathname === l.href ? 'font-semibold' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Center logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <img
              src="/dirty-apple-logo.png"
              alt="Dirty Apple"
              className={`h-8 md:h-9 w-auto object-contain transition-all duration-300 ${
                transparent ? 'brightness-0 invert' : 'mix-blend-multiply'
              }`}
            />
          </Link>

          {/* Right icons */}
          <div className="flex items-center gap-5">
            <Link
              href="/shop"
              className={`transition-colors duration-300 ${transparent ? 'text-white/80 hover:text-white' : 'text-black/60 hover:text-black'}`}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            <Link
              href="/cart"
              className={`transition-colors duration-300 ${transparent ? 'text-white/80 hover:text-white' : 'text-black/60 hover:text-black'}`}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>
          </div>

        </div>
      </nav>

      {/* Mobile full-screen menu */}
      <div
        className={`fixed inset-0 z-40 bg-black transition-all duration-500 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col justify-center h-full px-10 gap-8 pt-16">
          {[
            { href: '/shop',                        label: 'Shop All' },
            { href: '/shop?category=bags',          label: 'Bags' },
            { href: '/shop?category=shoes',         label: 'Shoes' },
            { href: '/shop?category=clothing',      label: 'Clothing' },
            { href: '/shop?category=accessories',   label: 'Accessories' },
            { href: '/collections/sale',            label: 'Sale' },
          ].map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="font-playfair text-4xl text-white hover:text-white/50 transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
