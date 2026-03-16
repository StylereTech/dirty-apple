'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import the Stripe-heavy checkout section — defers @stripe/stripe-js
// and @stripe/react-stripe-js from the initial bundle until the payment form renders.
const CheckoutPayment = dynamic(
  () => import('@/components/checkout/CheckoutPayment'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

const API = process.env.NEXT_PUBLIC_API_URL || 'https://dirty-apple-api-production.up.railway.app';

interface CartItem {
  _id: string; productId: string; name: string; brand: string;
  image: string; price: number; originalPrice?: number; quantity: number; size: string;
}

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/cart`).then(r => r.json())
      .then(d => { setItems(d.items || []); setSubtotal(d.subtotal || 0); })
      .catch(() => {});
  }, []);

  const shipping = subtotal > 500 ? 0 : 15;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen pt-20">
      <div className="bg-black text-white py-10 px-4 text-center">
        <h1 className="font-playfair text-3xl md:text-4xl">Checkout</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-inter text-sm mb-6">Your cart is empty</p>
            <Link href="/shop" className="inline-block bg-black text-white px-10 py-4 font-inter text-xs tracking-[0.2em]">SHOP NOW</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <CheckoutPayment items={items} subtotal={subtotal} />
            </div>
            <div className="lg:col-span-2">
              <div className="bg-neutral-50 p-6 sticky top-24">
                <h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-6">ORDER SUMMARY</h2>
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item._id} className="flex gap-3">
                      <div className="w-14 h-18 relative flex-shrink-0 bg-neutral-100">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-inter text-[10px] text-gray-400">{item.brand}</p>
                        <p className="font-inter text-xs line-clamp-1">{item.name}</p>
                        <p className="font-inter text-[10px] text-gray-400">Qty: {item.quantity} · {item.size}</p>
                      </div>
                      <p className="font-inter text-xs">${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-4 space-y-2 font-inter text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping}`}</span></div>
                  <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200"><span>Total</span><span>${total.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
