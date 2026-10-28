import Link from 'next/link';

export default function About() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <div className="min-h-screen pt-16">
      <div className="bg-black text-white py-24 text-center px-4"><h1 className="font-playfair text-4xl md:text-6xl mb-4">About Dirty Apple</h1><p className="font-inter text-gray-300 max-w-2xl mx-auto">Curated Luxury, Uncovered Prices</p></div>
      <div className="max-w-4xl mx-auto px-4 py-20 space-y-16 font-inter text-gray-600 leading-relaxed">
        <section><h2 className="font-playfair text-3xl text-black mb-6">Fashion worth discovering</h2><p>Dirty Apple brings fashion sale listings together so you can explore brands, categories and prices in one place. Each retailer listing identifies its source and links to the seller’s product page.</p></section>
        <section id="how-it-works" className="scroll-mt-24"><h2 className="font-playfair text-3xl text-black mb-8">How it works</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div><h3 className="text-black font-medium mb-3">1. Discover</h3><p>Browse current listings and narrow the selection by brand, category, price or discount.</p></div><div><h3 className="text-black font-medium mb-3">2. Check the details</h3><p>Review the listed price, retailer and available product information. A listing’s last checked time shows when its details were verified.</p></div><div><h3 className="text-black font-medium mb-3">3. Visit the retailer</h3><p>Retailer listings take you to the seller to confirm the final price, size and stock, and complete your purchase.</p></div></div><p className="mt-8 text-sm">A displayed discount compares the listed sale price with the source’s reference price. Promotions, taxes and delivery charges may change the final amount. Dirty Apple may earn a commission on links identified as affiliate links.</p></section>
        <section id="shipping" className="scroll-mt-24"><h2 className="font-playfair text-3xl text-black mb-6">Shipping & returns</h2><p>For purchases completed at a retailer, that retailer handles payment, shipping, returns and refunds. Check its policy before buying, especially for clearance and final-sale products. A retailer listing does not reserve inventory.</p></section>
        <section id="contact" className="scroll-mt-24"><h2 className="font-playfair text-3xl text-black mb-6">Order help</h2><p>For an order placed with a retailer, use the support details in that retailer’s order confirmation. Keep your receipt and order number.</p>{supportEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) ? <p className="mt-4">For Dirty Apple questions, email <a className="underline text-black" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p> : null}</section>
        <Link href="/shop" className="inline-block bg-black text-white px-10 py-4 text-xs tracking-[0.2em]">EXPLORE THE SHOP</Link>
      </div>
    </div>
  );
}
