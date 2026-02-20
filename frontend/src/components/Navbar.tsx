'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, []);

  const fetchCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCartCount(data.items?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart count:', error);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-sm py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="font-playfair text-2xl tracking-widest">
          <span className="inline-flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            DIRTY APPLE
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/shop"
            className={`font-inter text-sm tracking-widest hover:text-gray transition-colors ${
              pathname === '/shop' ? 'text-black' : scrolled ? 'text-black' : 'text-white'
            }`}
          >
            SHOP
          </Link>
          <Link
            href="/shop?category=bags"
            className={`font-inter text-sm tracking-widest hover:text-gray transition-colors ${
              scrolled ? 'text-black' : 'text-white'
            }`}
          >
            BAGS
          </Link>
          <Link
            href="/shop?category=shoes"
            className={`font-inter text-sm tracking-widest hover:text-gray transition-colors ${
              scrolled ? 'text-black' : 'text-white'
            }`}
          >
            SHOES
          </Link>
          <Link
            href="/about"
            className={`font-inter text-sm tracking-widest hover:text-gray transition-colors ${
              scrolled ? 'text-black' : 'text-white'
            }`}
          >
            ABOUT
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <button className={`hover:text-gray transition-colors ${scrolled ? 'text-black' : 'text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <Link
            href="/cart"
            className={`relative hover:text-gray transition-colors ${scrolled ? 'text-black' : 'text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
