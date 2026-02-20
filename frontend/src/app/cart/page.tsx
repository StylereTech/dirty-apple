'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        return;
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
    // Fallback mock data
    setItems([
      {
        _id: '1',
        productId: '1',
        name: 'GG Marmont Small Shoulder Bag',
        brand: 'Gucci',
        image: 'https://picsum.photos/seed/gucci1/600/800',
        price: 1699,
        quantity: 1,
        size: 'One Size',
      },
    ]);
    setLoading(false);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(itemId);
      return;
    }
    try {
      await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      setItems(items.map(item => 
        item._id === itemId ? { ...item, quantity } : item
      ));
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      setItems(items.filter(item => item._id !== itemId));
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading cart...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="font-playfair text-4xl mb-4">Your Cart is Empty</h1>
        <p className="text-gray font-inter font-light mb-8">Discover luxury at uncovered prices</p>
        <Link
          href="/shop"
          className="bg-black text-white px-8 py-3 font-inter text-sm tracking-widest hover:bg-charcoal transition-colors"
        >
          START SHOPPING
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-black text-white py-16 text-center">
        <h1 className="font-playfair text-4xl md:text-5xl mb-4">Shopping Cart</h1>
        <p className="font-inter font-light text-gray-300">{items.length} item{items.length !== 1 && 's'}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {items.map((item) => (
              <div key={item._id} className="flex gap-6 py-6 border-b border-gray-200">
                <Link href={`/product/${item.productId}`} className="w-32 h-40 relative flex-shrink-0">
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                </Link>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-gray text-xs tracking-widest mb-1">{item.brand}</p>
                      <Link href={`/product/${item.productId}`} className="font-playfair text-lg hover:text-gray">
                        {item.name}
                      </Link>
                      <p className="text-sm text-gray mt-1">Size: {item.size}</p>
                    </div>
                    <p className="font-inter font-semibold">${item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="w-8 h-8 border border-gray-300 flex items-center justify-center hover:border-black transition-colors"
                      >
                        -
                      </button>
                      <span className="font-inter w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="w-8 h-8 border border-gray-300 flex items-center justify-center hover:border-black transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item._id)}
                      className="text-sm text-gray hover:text-black transition-colors underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-6 sticky top-24">
              <h2 className="font-playfair text-xl mb-6">Order Summary</h2>
              <div className="space-y-3 font-inter">
                <div className="flex justify-between">
                  <span className="text-gray">Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray">Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `$${shipping}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray">Free shipping on orders over $500</p>
                )}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Link
                href="/checkout"
                className="block w-full bg-black text-white py-4 font-inter text-sm tracking-widest text-center hover:bg-charcoal transition-colors mt-6"
              >
                PROCEED TO CHECKOUT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
