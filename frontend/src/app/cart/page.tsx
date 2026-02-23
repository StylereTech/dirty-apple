'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface CartItem {
  _id: string; productId: string; name: string; brand: string;
  image: string; price: number; quantity: number; size: string;
}

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/cart`).then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return removeItem(id);
    const res = await fetch(`${API}/api/cart/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty }),
    });
    const d = await res.json();
    setItems(d.items);
  };

  const removeItem = async (id: string) => {
    const res = await fetch(`${API}/api/cart/${id}`, { method: 'DELETE' });
    const d = await res.json();
    setItems(d.items);
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const total = subtotal + shipping;

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center font-inter text-gray-500">Loading...</div>;

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4">
        <h1 className="font-playfair text-3xl mb-3">Your Cart is Empty</h1>
        <p className="text-gray-500 font-inter text-sm mb-8">Discover luxury at uncovered prices</p>
        <Link href="/shop" className="bg-black text-white px-10 py-4 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800 transition-colors">
          SHOP NOW
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="bg-black text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-playfair text-3xl md:text-4xl">Shopping Cart</h1>
          <p className="font-inter text-xs text-gray-500 mt-2">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 divide-y divide-gray-200">
            {items.map(item => (
              <div key={item._id} className="flex gap-5 py-6">
                <Link href={`/product/${item.productId}`} className="w-24 h-32 relative flex-shrink-0 bg-neutral-100">
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-[10px] tracking-[0.2em] text-gray-400">{item.brand?.toUpperCase()}</p>
                  <Link href={`/product/${item.productId}`} className="font-inter text-sm hover:text-gray-600 line-clamp-1">{item.name}</Link>
                  <p className="text-xs text-gray-400 mt-1 font-inter">Size: {item.size}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center">
                      <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-7 h-7 border border-gray-300 flex items-center justify-center text-sm hover:border-black">−</button>
                      <span className="w-8 h-7 border-y border-gray-300 flex items-center justify-center font-inter text-xs">{item.quantity}</span>
                      <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-7 h-7 border border-gray-300 flex items-center justify-center text-sm hover:border-black">+</button>
                    </div>
                    <div className="text-right">
                      <p className="font-inter text-sm">${(item.price * item.quantity).toLocaleString()}</p>
                      <button onClick={() => removeItem(item._id)} className="text-[10px] text-gray-400 hover:text-black underline font-inter mt-1">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-neutral-50 p-6 sticky top-24">
              <h2 className="font-inter text-xs tracking-[0.2em] mb-6">ORDER SUMMARY</h2>
              <div className="space-y-3 font-inter text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping}`}</span></div>
                {shipping > 0 && <p className="text-[10px] text-gray-400">Free shipping on orders over $500</p>}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-medium text-base"><span>Total</span><span>${total.toLocaleString()}</span></div>
                </div>
              </div>
              <Link href="/checkout" className="block w-full bg-black text-white py-4 font-inter text-xs tracking-[0.2em] text-center hover:bg-neutral-800 transition-colors mt-6">
                CHECKOUT
              </Link>
              <Link href="/shop" className="block w-full border border-gray-300 py-3 font-inter text-xs tracking-[0.2em] text-center hover:border-black transition-colors mt-3">
                CONTINUE SHOPPING
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
