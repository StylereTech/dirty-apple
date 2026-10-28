import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div><h2 className="font-playfair text-2xl tracking-widest mb-6">DIRTY APPLE</h2><p className="font-inter text-gray-400 text-sm leading-relaxed">Curated Luxury, Uncovered Prices. Discover fashion sale listings and compare the details before you shop.</p></div>
          <div><h3 className="font-inter text-sm tracking-widest mb-4">SHOP</h3><ul className="space-y-2 font-inter text-gray-400 text-sm">{['bags', 'shoes', 'clothing', 'accessories'].map(category => <li key={category}><Link href={`/shop?category=${category}`} className="hover:text-white capitalize">{category}</Link></li>)}<li><Link href="/collections/sale" className="hover:text-white">Sale</Link></li></ul></div>
          <div><h3 className="font-inter text-sm tracking-widest mb-4">ABOUT YOUR PURCHASE</h3><ul className="space-y-2 font-inter text-gray-400 text-sm"><li><Link href="/about" className="hover:text-white">About Dirty Apple</Link></li><li><Link href="/about#how-it-works" className="hover:text-white">How it works</Link></li><li><Link href="/about#shipping" className="hover:text-white">Retailer shipping & returns</Link></li><li><Link href="/about#contact" className="hover:text-white">Order help</Link></li></ul><p className="mt-5 text-xs text-gray-400 leading-relaxed">Prices and availability can change. Check the retailer’s final price and terms before purchasing.</p></div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8"><p className="font-inter text-gray-400 text-xs">© {new Date().getFullYear()} Dirty Apple. All rights reserved.</p></div>
      </div>
    </footer>
  );
}
