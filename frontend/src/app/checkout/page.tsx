'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://dirty-apple-api-production.up.railway.app';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface CartItem {
  _id: string; productId: string; name: string; brand: string;
  image: string; price: number; originalPrice?: number; quantity: number; size: string;
}

function CheckoutForm({ items, subtotal }: { items: CartItem[]; subtotal: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', address: '',
    city: '', state: '', zip: '', country: 'US', phone: '',
  });

  const shipping = subtotal > 500 ? 0 : 15;
  const total = subtotal + shipping;
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError('');

    try {
      const res = await fetch(`${API}/api/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer: form }),
      });
      const { clientSecret, error: err } = await res.json();
      if (err) { setError(err); setLoading(false); return; }

      const card = elements.getElement(CardElement);
      if (!card) { setError('Card element not found'); setLoading(false); return; }

      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            email: form.email,
            name: `${form.firstName} ${form.lastName}`,
            phone: form.phone,
            address: { line1: form.address, city: form.city, state: form.state, postal_code: form.zip, country: form.country },
          },
        },
      });

      if (stripeErr) { setError(stripeErr.message || 'Payment failed'); setLoading(false); return; }
      if (paymentIntent?.status === 'succeeded') {
        // Create order
        await fetch(`${API}/api/checkout/confirm`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id, items, customer: form }),
        });
        setSuccess(true);
      }
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 mx-auto mb-6 bg-black text-white rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-playfair text-3xl mb-3">Order Confirmed</h2>
        <p className="text-gray-500 font-inter text-sm mb-8">You'll receive a confirmation email shortly.</p>
        <Link href="/shop" className="inline-block bg-black text-white px-10 py-4 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800 transition-colors">
          CONTINUE SHOPPING
        </Link>
      </div>
    );
  }

  const inputClass = "w-full border border-gray-300 px-4 py-3 font-inter text-sm focus:outline-none focus:border-black placeholder:text-gray-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-4">CONTACT</h2>
        <input type="email" placeholder="Email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
      </div>
      <div>
        <h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-4">SHIPPING</h2>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="First name" required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputClass} />
          <input type="text" placeholder="Last name" required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputClass} />
        </div>
        <input type="text" placeholder="Address" required value={form.address} onChange={e => set('address', e.target.value)} className={`${inputClass} mt-3`} />
        <div className="grid grid-cols-3 gap-3 mt-3">
          <input type="text" placeholder="City" required value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
          <input type="text" placeholder="State" required value={form.state} onChange={e => set('state', e.target.value)} className={inputClass} />
          <input type="text" placeholder="ZIP" required value={form.zip} onChange={e => set('zip', e.target.value)} className={inputClass} />
        </div>
        <input type="tel" placeholder="Phone" required value={form.phone} onChange={e => set('phone', e.target.value)} className={`${inputClass} mt-3`} />
      </div>
      <div>
        <h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-4">PAYMENT</h2>
        <div className="border border-gray-300 p-4">
          <CardElement options={{ style: { base: { fontSize: '14px', fontFamily: 'Inter, sans-serif', color: '#000', '::placeholder': { color: '#999' } } } }} />
        </div>
      </div>
      {error && <div className="bg-red-50 text-red-600 p-3 font-inter text-sm">{error}</div>}
      <button type="submit" disabled={!stripe || loading}
        className="w-full bg-black text-white py-4 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800 transition-colors disabled:opacity-50">
        {loading ? 'PROCESSING...' : `PAY $${total.toLocaleString()}`}
      </button>
    </form>
  );
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
              <Elements stripe={stripePromise}>
                <CheckoutForm items={items} subtotal={subtotal} />
              </Elements>
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
