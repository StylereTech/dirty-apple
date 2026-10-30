'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoadError from '@/components/LoadError';
import PageAtmosphere from '@/components/PageAtmosphere';
import { cartRequest, errorMessage } from '@/lib/api';
import { CartItem, CartData, money, shippingFor } from '@/lib/catalog';

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

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [retry, setRetry] = useState(0);
  const [quote, setQuote] = useState<{ subtotal: number; shipping: number; total: number } | null>(null);

  useEffect(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem('dirty-apple-pending-confirmation') || 'null');
      setRecovering(typeof pending?.paymentIntentId === 'string' && typeof pending.orderAccessToken === 'string');
    } catch { setRecovering(false); }
    const controller = new AbortController();
    setLoading(true); setError('');
    cartRequest<CartData>('', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.items); setSubtotal(data.subtotal); } })
      .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const shipping = quote?.shipping ?? shippingFor(subtotal);
  const total = quote?.total ?? subtotal + shipping;
  const hasUnavailable = items.some(item => item.unavailable);

  return (
    <div className="expressive-commerce min-h-screen pt-20">
      <div className="expressive-header commerce-header bg-black text-white py-10 px-4 text-center"><PageAtmosphere variant="checkout" image="/cat-bags.jpg" />
        <h1 className="font-playfair text-3xl md:text-4xl">Checkout</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {recovering ? <CheckoutPayment items={[]} subtotal={0} onQuote={setQuote} /> : loading ? <p className="text-center py-16">Loading your cart...</p> : error ? <LoadError message={error} onRetry={() => setRetry(r => r + 1)} /> : hasUnavailable ? <div role="alert" className="text-center py-16"><p className="mb-4">Some items are no longer available. Update your cart before checking out.</p><Link href="/cart" className="underline">Return to cart</Link></div> : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-inter text-sm mb-6">Your cart is empty</p>
            <Link href="/shop" className="inline-block bg-black text-white px-10 py-4 font-inter text-xs tracking-[0.2em]">SHOP NOW</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <CheckoutPayment items={items} subtotal={subtotal} onQuote={setQuote} />
            </div>
            <div className="lg:col-span-2">
              <div className="expressive-summary bg-neutral-50 p-6 sticky top-24">
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
                      <p className="font-inter text-xs">{money(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-4 space-y-2 font-inter text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{money(quote?.subtotal ?? subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping}`}</span></div>
                  <div className="flex justify-between font-medium text-base pt-2 border-t border-gray-200"><span>Total</span><span>{money(total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
