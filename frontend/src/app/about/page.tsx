export default function About() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const hasSupportEmail = !!supportEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail);
  return (
    <div className="min-h-screen">
      <div className="bg-black text-white py-24 text-center px-4">
        <h1 className="font-playfair text-4xl md:text-6xl mb-4">About Dirty Apple</h1>
        <p className="font-inter font-light text-gray-300 max-w-2xl mx-auto">
          Curated Luxury, Uncovered Prices
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-20">
        <section className="mb-20">
          <h2 className="font-playfair text-3xl mb-6">Our Story</h2>
          <p className="font-inter text-gray font-light leading-relaxed mb-6">
            Dirty Apple was born from a simple observation: luxury fashion retains its elegance and craftsmanship,
            but its prices often don't reflect the true value. We created a platform that bridges the gap between
            discerning fashion enthusiasts and the world's most coveted brands.
          </p>
          <p className="font-inter text-gray font-light leading-relaxed">
            We believe that exceptional quality and timeless design should be accessible. Each retailer listing identifies its source
            and links to the seller, so you can compare the product details, current price and terms
            before you purchase.
          </p>
        </section>

        <section id="how-it-works" className="mb-20 scroll-mt-24">
          <h2 className="font-playfair text-3xl mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-black text-white flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-playfair text-xl mb-3">1. We Search</h3>
              <p className="font-inter text-gray font-light">
                Explore sale listings from fashion retailers and compare brands, categories and prices in one place.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-black text-white flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-playfair text-xl mb-3">2. We Verify</h3>
              <p className="font-inter text-gray font-light">
                We check listing details against source data. Visit the retailer to confirm the current price, size and availability.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-black text-white flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-playfair text-xl mb-3">3. You Save</h3>
              <p className="font-inter text-gray font-light">
                Discover marked-down pieces and complete retailer-listed purchases on the retailer’s website.
              </p>
            </div>
          </div>
        </section>

        <section id="shipping" className="mb-20 scroll-mt-24">
          <h2 className="font-playfair text-3xl mb-6">Our Promise</h2>
          <ul className="space-y-4 font-inter text-gray font-light">
            <li className="flex items-start gap-3">
              <span className="text-black text-xl">✓</span>
              <span>Retailer sources and product links shown on external listings</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-black text-xl">✓</span>
              <span>Reference and sale prices displayed together for discounted items</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-black text-xl">✓</span>
              <span>Shipping and delivery terms provided by the retailer</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-black text-xl">✓</span>
              <span>Returns follow the retailer’s policy, including final-sale restrictions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-black text-xl">✓</span>
              <span>Current price and stock confirmed at the retailer before purchase</span>
            </li>
          </ul>
        </section>

        <section id="contact" className="scroll-mt-24">
          <h2 className="font-playfair text-3xl mb-6">Contact Us</h2>
          <p className="font-inter text-gray font-light mb-4">
            Have questions? We'd love to hear from you.
          </p>
          <div className="font-inter">
            <p className="mb-2">Email: {hasSupportEmail ? <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a> : 'Support email is currently unavailable.'}</p>
            <p className="mb-2">Phone: Phone support is currently unavailable.</p>
            <p>For retailer purchases, use the support details in your order confirmation.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
