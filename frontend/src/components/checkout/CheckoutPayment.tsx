'use client';

import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getStripe } from '@/lib/stripe/client';
import { ApiError, apiRequest, cartRequest, errorMessage } from '@/lib/api';
import { CartData, CartItem, money, shippingFor } from '@/lib/catalog';

interface Quote { subtotal: number; shipping: number; total: number }
interface PaymentSetup extends Quote { clientSecret: string; orderId: string; orderAccessToken: string; paymentIntentId: string; paymentStatus: string }
interface PendingPayment { paymentIntentId: string; orderAccessToken: string; items: Pick<CartItem, '_id' | 'productId' | 'size' | 'quantity'>[] }
const PENDING_KEY = 'dirty-apple-pending-confirmation';
const ATTEMPT_KEY = 'dirty-apple-checkout-attempt';

function savePending(value: PendingPayment) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(value)); } catch { /* The current page can still finish confirmation. */ }
}

async function checkoutKey(payload: string, previous: { current: { payload: string; key: string } | null }) {
  if (previous.current?.payload === payload) return previous.current.key;
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  let key = window.crypto.randomUUID();
  try {
    const saved = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) || 'null');
    if (saved?.fingerprint === fingerprint && typeof saved.key === 'string') key = saved.key;
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ fingerprint, key }));
  } catch { /* Current-page retries still reuse the key. */ }
  previous.current = { payload, key };
  return key;
}

function CheckoutForm({ items, subtotal, onQuote }: { items: CartItem[]; subtotal: number; onQuote: (quote: Quote) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const busy = useRef(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', address: '', city: '', state: '', zip: '', country: 'US', phone: '' });
  const total = quotedTotal ?? subtotal + shippingFor(subtotal);
  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      if (typeof saved?.paymentIntentId === 'string' && saved.paymentIntentId.startsWith('pi_') && typeof saved.orderAccessToken === 'string' && Array.isArray(saved.items)) setPending(saved);
    } catch { /* No recoverable payment. */ }
  }, []);

  const confirmOrder = async (payment: PendingPayment) => {
    const order = await apiRequest<{ orderNumber: string; paymentStatus: string }>('/checkout/confirm', { method: 'POST', body: JSON.stringify({ paymentIntentId: payment.paymentIntentId, orderAccessToken: payment.orderAccessToken }) }, true);
    if (order.paymentStatus !== 'paid' || !order.orderNumber) throw new Error('Confirmation is still pending.');
    setSuccess(order.orderNumber);
    setPending(null);
    // Never turn an already-confirmed payment into a failed checkout because cleanup failed.
    try { sessionStorage.removeItem(PENDING_KEY); sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* Session storage may be unavailable. */ }
    try {
      const current = await cartRequest<CartData>();
      for (const bought of payment.items) {
        const unchanged = current.items.find(item => item._id === bought._id && item.productId === bought.productId && item.size === bought.size && item.quantity === bought.quantity);
        if (unchanged) await cartRequest(`/${encodeURIComponent(bought._id)}`, { method: 'DELETE', body: JSON.stringify({ expectedQuantity: bought.quantity, expectedProductId: bought.productId, expectedSize: bought.size }) });
      }
    } catch { /* The order is paid; remaining cart items can be removed manually. */ }
  };

  const retryConfirmation = async () => {
    if (!pending || busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try { await confirmOrder(pending); }
    catch { setError('Payment verification or order confirmation is still pending. Retry confirmation below before starting another payment.'); }
    finally { busy.current = false; setLoading(false); }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || busy.current || pending) return;
    busy.current = true; setLoading(true); setError('');
    let paid: PendingPayment | null = null;
    try {
      const body = JSON.stringify({ items: items.map(item => ({ productId: item.productId, quantity: item.quantity, size: item.size })), customer: form });
      const key = await checkoutKey(body, attempt);
      const setup = await apiRequest<PaymentSetup>('/checkout', { method: 'POST', headers: { 'Idempotency-Key': key }, body }, true);
      if (!setup.clientSecret || !setup.orderAccessToken || !Number.isFinite(setup.total)) throw new Error('Invalid payment setup.');
      onQuote({ subtotal: setup.subtotal, shipping: setup.shipping, total: setup.total });
      if (['succeeded', 'processing', 'requires_capture'].includes(setup.paymentStatus)) {
        paid = { paymentIntentId: setup.paymentIntentId, orderAccessToken: setup.orderAccessToken, items: items.map(({ _id, productId, size, quantity }) => ({ _id, productId, size, quantity })) };
        savePending(paid); setPending(paid);
        await confirmOrder(paid);
        return;
      }
      if (Math.round(setup.total * 100) !== Math.round(total * 100)) {
        setQuotedTotal(setup.total);
        setError(`The current total is ${money(setup.total)}. Review the updated order summary and press Pay to continue.`);
        return;
      }
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('The payment form is unavailable.');
      const result = await stripe.confirmCardPayment(setup.clientSecret, { payment_method: { card, billing_details: { email: form.email, name: `${form.firstName} ${form.lastName}`, phone: form.phone || undefined, address: { line1: form.address, city: form.city, state: form.state, postal_code: form.zip, country: form.country } } } });
      const recoveredIntent = result.paymentIntent || result.error?.payment_intent;
      if (recoveredIntent && ['succeeded', 'processing', 'requires_capture'].includes(recoveredIntent.status)) {
        paid = { paymentIntentId: recoveredIntent.id, orderAccessToken: setup.orderAccessToken, items: items.map(({ _id, productId, size, quantity }) => ({ _id, productId, size, quantity })) };
        savePending(paid); setPending(paid);
        await confirmOrder(paid);
        return;
      }
      if (result.error) { setError(result.error.message || 'Payment could not be completed.'); return; }
      setError('Payment has not completed. Retry with the same details to continue the existing payment.');

    } catch (err) {
      if (!paid && err instanceof ApiError && err.status === 410) {
        attempt.current = null;
        try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* The next explicit attempt still receives a new key. */ }
      }
      setError(paid ? 'Payment verification or order confirmation is still pending. Retry confirmation below before starting another payment.' : errorMessage(err));
    } finally { busy.current = false; setLoading(false); }
  };

  if (success) return <div className="text-center py-16"><h2 className="font-playfair text-3xl mb-3">Order Confirmed</h2><p className="font-inter text-sm text-gray-600 mb-4">Order {success}</p><p className="text-sm text-gray-500 mb-8">Save your order number for reference.</p><Link href="/shop" className="inline-block bg-black text-white px-10 py-4 text-xs tracking-[0.2em]">CONTINUE SHOPPING</Link></div>;
  if (pending) return <div className="border p-6"><h2 className="font-playfair text-2xl mb-3">Finish order confirmation</h2><p className="text-sm text-gray-600 mb-4">We have a payment awaiting order confirmation. You can retry this step without making another payment.</p>{error && <p role="alert" className="text-sm text-red-700 mb-4">{error}</p>}<button onClick={retryConfirmation} disabled={loading} className="bg-black text-white px-6 py-3 text-xs disabled:opacity-50">{loading ? 'CONFIRMING...' : 'RETRY CONFIRMATION'}</button></div>;

  const inputClass = 'w-full border border-gray-300 px-4 py-3 font-inter text-sm focus:outline-none focus:border-black placeholder:text-gray-400';
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset disabled={loading} className="space-y-8">
        <div><h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-4">CONTACT</h2><input aria-label="Email" autoComplete="email" type="email" placeholder="Email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} /></div>
        <div><h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-4">SHIPPING — UNITED STATES</h2><div className="grid grid-cols-2 gap-3"><input aria-label="First name" autoComplete="given-name" placeholder="First name" required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputClass} /><input aria-label="Last name" autoComplete="family-name" placeholder="Last name" required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputClass} /></div><input aria-label="Street address" autoComplete="street-address" placeholder="Address" required value={form.address} onChange={e => set('address', e.target.value)} className={`${inputClass} mt-3`} /><div className="grid grid-cols-3 gap-3 mt-3"><input aria-label="City" autoComplete="address-level2" placeholder="City" required value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} /><input aria-label="State" autoComplete="address-level1" placeholder="State" required value={form.state} onChange={e => set('state', e.target.value)} className={inputClass} /><input aria-label="ZIP code" autoComplete="postal-code" placeholder="ZIP" required value={form.zip} onChange={e => set('zip', e.target.value)} className={inputClass} /></div><input aria-label="Phone (optional)" autoComplete="tel" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => set('phone', e.target.value)} className={`${inputClass} mt-3`} /></div>
        <div><h2 className="font-inter text-xs tracking-[0.2em] text-gray-500 mb-4">PAYMENT</h2><div className="border border-gray-300 p-4"><CardElement options={{ style: { base: { fontSize: '14px', fontFamily: 'Inter, sans-serif', color: '#000' } } }} /></div></div>
      </fieldset>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 font-inter text-sm">{error}</div>}
      <button type="submit" disabled={!stripe || loading} className="w-full bg-black text-white py-4 font-inter text-xs tracking-[0.2em] disabled:opacity-50">{loading ? 'PROCESSING...' : `PAY ${money(total)}`}</button>
    </form>
  );
}

export default function CheckoutPayment(props: { items: CartItem[]; subtotal: number; onQuote: (quote: Quote) => void }) {
  const stripe = useMemo(() => getStripe(), []);
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!/^pk_(test|live)_[A-Za-z0-9]+$/.test(key) || /placeholder|your_/i.test(key)) return <div role="alert" className="border p-6 text-sm text-gray-700">Direct checkout is currently unavailable. Your cart has been saved.<Link href="/cart" className="block underline mt-4">Return to cart</Link></div>;
  return <Elements stripe={stripe}><CheckoutForm {...props} /></Elements>;
}
