import Link from 'next/link';
import AtmosphereState from '@/components/AtmosphereState';


export default function CheckoutComplete() {
  return <AtmosphereState><h1 className="font-playfair text-3xl mb-5">Check your order confirmation</h1><p className="text-gray-600 leading-relaxed mb-8">Returning from a payment provider does not by itself confirm an order. Return to checkout to finish any pending confirmation, and keep your order number once it appears.</p><Link href="/checkout" className="inline-block bg-black text-white px-8 py-4 text-xs tracking-widest">RETURN TO CHECKOUT</Link></AtmosphereState>;
}