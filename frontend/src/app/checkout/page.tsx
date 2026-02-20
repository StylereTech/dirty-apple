'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface CartItem {
  _id: string;
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  quantity: number;
  size: string;
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSubtotal(data.items?.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0) || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  };

  const shipping = subtotal > 500 ? 0 : 15;
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // Create payment intent
      const intentRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer: formData,
        }),
      });

      const { clientSecret, error: intentError } = await intentRes.json();

      if (intentError) {
        setError(intentError);
        setLoading(false);
        return;
      }

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card element not found');
        setLoading(false);
        return;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            address: {
              line1: formData.address,
              city: formData.city,
              state: formData.state,
              postal_code: formData.zip,
              country: formData.country,
            },
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-playfair text-4xl mb-4">Order Confirmed!</h1>
          <p className="text-gray font-inter font-light mb-8">
            Thank you for your purchase. You will receive a confirmation email shortly.
          </p>
          <a
            href="/shop"
            className="inline-block bg-black text-white px-8 py-3 font-inter text-sm tracking-widest hover:bg-charcoal transition-colors"
          >
            CONTINUE SHOPPING
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="font-playfair text-xl mb-4">Contact Information</h2>
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
        />
      </div>

      <div>
        <h2 className="font-playfair text-xl mb-4">Shipping Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="firstName"
            placeholder="First name"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last name"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
          />
        </div>
        <input
          type="text"
          name="address"
          placeholder="Address"
          required
          value={formData.address}
          onChange={handleChange}
          className="w-full border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black mt-4"
        />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            type="text"
            name="city"
            placeholder="City"
            required
            value={formData.city}
            onChange={handleChange}
            className="border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            required
            value={formData.state}
            onChange={handleChange}
            className="border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            type="text"
            name="zip"
            placeholder="ZIP code"
            required
            value={formData.zip}
            onChange={handleChange}
            className="border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
          />
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
          </select>
        </div>
        <input
          type="tel"
          name="phone"
          placeholder="Phone"
          required
          value={formData.phone}
          onChange={handleChange}
          className="w-full border border-gray-300 px-4 py-3 font-inter focus:outline-none focus:border-black mt-4"
        />
      </div>

      <div>
        <h2 className="font-playfair text-xl mb-4">Payment</h2>
        <div className="border border-gray-300 p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  fontFamily: 'Inter, sans-serif',
                  color: '#000000',
                  '::placeholder': { color: '#8A8A8A' },
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 font-inter text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-black text-white py-4 font-inter text-sm tracking-widest hover:bg-charcoal transition-colors disabled:opacity-50"
      >
        {loading ? 'PROCESSING...' : `PAY $${total.toLocaleString()}`}
      </button>
    </form>
  );
}

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSubtotal(data.items?.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0) || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  };

  const shipping = subtotal > 500 ? 0 : 15;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen">
      <div className="bg-black text-white py-16 text-center">
        <h1 className="font-playfair text-4xl md:text-5xl mb-4">Checkout</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray font-inter mb-8">Your cart is empty</p>
            <a
              href="/shop"
              className="inline-block bg-black text-white px-8 py-3 font-inter text-sm tracking-widest hover:bg-charcoal transition-colors"
            >
              START SHOPPING
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <Elements stripe={stripePromise}>
                <CheckoutForm />
              </Elements>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-50 p-6 sticky top-24">
                <h2 className="font-playfair text-xl mb-6">Order Summary</h2>
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item._id} className="flex gap-4">
                      <div className="w-16 h-20 relative flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray">{item.brand}</p>
                        <p className="font-inter text-sm line-clamp-1">{item.name}</p>
                        <p className="text-xs text-gray">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-inter text-sm">${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-4 space-y-2 font-inter">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray">Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray">Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `$${shipping}`}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2">
                    <span>Total</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
