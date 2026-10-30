'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadError from '@/components/LoadError';
import PageAtmosphere from '@/components/PageAtmosphere';
import { cartRequest, errorMessage } from '@/lib/api';
import { CartItem, CartData, money, shippingFor } from '@/lib/catalog';

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    cartRequest<CartData>('', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setItems(data.items); })
      .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const changeCart = async (id: string, quantity?: number) => {
    if (busy) return;
    setBusy(true); setMutationError('');
    try {
      const data = await cartRequest<CartData>(`/${encodeURIComponent(id)}`, quantity === undefined || quantity < 1 ? { method: 'DELETE' } : { method: 'PATCH', body: JSON.stringify({ quantity }) });
      setItems(data.items);
    } catch (err) { setMutationError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const updateQty = (id: string, qty: number) => changeCart(id, qty);
  const removeItem = (id: string) => changeCart(id);

  const hasUnavailable = items.some(item => item.unavailable);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center font-inter text-gray-500">Loading...</div>;

  if (error) return <div className="min-h-screen pt-32 px-4 max-w-3xl mx-auto"><h1 className="font-playfair text-3xl mb-6">Shopping Cart</h1><LoadError message={error} onRetry={() => setRetry(r => r + 1)} /></div>;

  if (items.length === 0) {
    return (
      <div className="expressive-empty min-h-screen pt-24 flex flex-col items-center justify-center px-4">
        <h1 className="font-playfair text-3xl mb-3">Your Cart is Empty</h1>
        <p className="text-gray-500 font-inter text-sm mb-8">Discover luxury at uncovered prices</p>
        <Link href="/shop" className="bg-black text-white px-10 py-4 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800 transition-colors">
          SHOP NOW
        </Link>
      </div>
    );
  }

  return (
    <div className="expressive-commerce min-h-screen pt-20">
      <div className="expressive-header commerce-header bg-black text-white py-10 px-4"><PageAtmosphere variant="checkout" image="/cat-bags.jpg" />
        <div className="max-w-7xl mx-auto">
          <h1 className="font-playfair text-3xl md:text-4xl">Shopping Cart</h1>
          <p className="font-inter text-xs text-gray-500 mt-2">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {hasUnavailable && <p role="alert" className="bg-amber-50 text-amber-900 p-4 mb-6">Some items are no longer available. Remove them before checking out.</p>}
        {mutationError && <p role="alert" className="bg-red-50 text-red-800 p-4 mb-6">{mutationError}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 divide-y divide-gray-200">
            {items.map(item => (
              <div key={item._id} className="flex gap-5 py-6">
                <Link href={`/product/${item.productId}`} className="w-24 h-32 relative flex-shrink-0 bg-neutral-100">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-[10px] tracking-[0.2em] text-gray-400">{item.brand?.toUpperCase()}</p>
                  <Link href={`/product/${item.productId}`} className="font-inter text-sm hover:text-gray-600 line-clamp-1">{item.name}</Link>
                  <p className="text-xs text-gray-400 mt-1 font-inter">Size: {item.size}</p>{item.unavailable && <p className="text-red-700 text-xs mt-1">Unavailable — please remove</p>}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center">
                      <button disabled={busy} aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateQty(item._id, item.quantity - 1)} className="w-7 h-7 border border-gray-300 flex items-center justify-center text-sm hover:border-black">−</button>
                      <span className="w-8 h-7 border-y border-gray-300 flex items-center justify-center font-inter text-xs">{item.quantity}</span>
                      <button disabled={busy || item.unavailable || item.quantity >= 10} aria-label={`Increase quantity of ${item.name}`} onClick={() => updateQty(item._id, item.quantity + 1)} className="w-7 h-7 border border-gray-300 flex items-center justify-center text-sm hover:border-black">+</button>
                    </div>
                    <div className="text-right">
                      <p className="font-inter text-sm">{money(item.price * item.quantity)}</p>
                      <button disabled={busy} onClick={() => removeItem(item._id)} className="text-[10px] text-gray-400 hover:text-black underline font-inter mt-1">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="expressive-summary bg-neutral-50 p-6 sticky top-24">
              <h2 className="font-inter text-xs tracking-[0.2em] mb-6">ORDER SUMMARY</h2>
              <div className="space-y-3 font-inter text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping}`}</span></div>
                {shipping > 0 && <p className="text-[10px] text-gray-400">Free shipping on orders over $500</p>}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-medium text-base"><span>Total</span><span>{money(total)}</span></div>
                </div>
              </div>
              <Link href={busy || hasUnavailable ? "/cart" : "/checkout"} aria-disabled={busy || hasUnavailable} className="block w-full bg-black text-white py-4 font-inter text-xs tracking-[0.2em] text-center hover:bg-neutral-800 transition-colors mt-6">
                {hasUnavailable ? 'REMOVE UNAVAILABLE ITEMS' : busy ? 'UPDATING CART...' : 'CHECKOUT'}
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
