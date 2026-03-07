'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const textColor = (!scrolled && isHome && !menuOpen) ? 'text-white' : 'text-black';
  const bgColor = (scrolled || !isHome || menuOpen) ? 'bg-white border-b border-gray-100' : 'bg-transparent';

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgColor}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Menu toggle (mobile) */}
          <button onClick={() => setMenuOpen(!menuOpen)} className={`lg:hidden ${textColor}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* Left nav */}
          <div className="hidden lg:flex items-center gap-7">
            {[
              { href: '/shop', label: 'SHOP' },
              { href: '/collections/editors-picks', label: 'PICKS' },
              { href: '/collections/sale', label: 'SALE' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className={`font-inter text-[11px] tracking-[0.15em] ${textColor} hover:opacity-60 transition-opacity ${pathname === link.href ? 'font-medium' : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <Image
              src="/dirty-apple-logo.jpg"
              alt="Dirty Apple"
              width={120}
              height={40}
              className="h-8 md:h-10 w-auto object-contain"
              priority
            />
          </Link>

          {/* Right nav */}
          <div className="flex items-center gap-5">
            <Link href="/shop?search=" className={`${textColor} hover:opacity-60 transition-opacity`}>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            <Link href="/cart" className={`${textColor} hover:opacity-60 transition-opacity`}>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16">
          <div className="px-6 py-8 space-y-6">
            {[
              { href: '/shop', label: 'Shop All' },
              { href: '/shop?category=Bags', label: 'Bags' },
              { href: '/shop?category=Shoes', label: 'Shoes' },
              { href: '/shop?category=Clothing', label: 'Clothing' },
              { href: '/shop?category=Accessories', label: 'Accessories' },
              { href: '/collections/editors-picks', label: "Editor's Picks" },
              { href: '/collections/trending', label: 'Trending' },
              { href: '/collections/sale', label: 'Sale' },
              { href: '/about', label: 'About' },
            ].map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className="block font-playfair text-2xl hover:text-gray-500 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
