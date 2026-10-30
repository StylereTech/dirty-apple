import Link from 'next/link';

export default function CheckoutComplete() {
  return <div className="expressive-confirmation min-h-screen pt-32 px-4 text-center max-w-2xl mx-auto"><h1 className="font-playfair text-3xl mb-5">Check your order confirmation</h1><p className="text-gray-600 leading-relaxed mb-8">Returning from a payment provider does not by itself confirm an order. Return to checkout to finish any pending confirmation, and keep your order number once it appears.</p><Link href="/checkout" className="inline-block bg-black text-white px-8 py-4 text-xs tracking-widest">RETURN TO CHECKOUT</Link></div>;
}
