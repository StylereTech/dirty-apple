import Link from 'next/link';
import Image from 'next/image';

const categories = [
  { name: 'Bags', slug: 'bags', image: 'https://picsum.photos/seed/bags/800/1000' },
  { name: 'Shoes', slug: 'shoes', image: 'https://picsum.photos/seed/shoes/800/1000' },
  { name: 'Clothing', slug: 'clothing', image: 'https://picsum.photos/seed/clothing/800/1000' },
  { name: 'Accessories', slug: 'accessories', image: 'https://picsum.photos/seed/accessories/800/1000' },
];

const featuredProducts = [
  {
    id: '1',
    brand: 'Gucci',
    name: 'GG Marmont Small Shoulder Bag',
    originalPrice: 2350,
    ourPrice: 1699,
    image: 'https://picsum.photos/seed/gucci1/600/800',
    discount: 28,
  },
  {
    id: '2',
    brand: 'Prada',
    name: 'Re-Edition 2005 Saffiano Leather Bag',
    originalPrice: 1850,
    ourPrice: 1299,
    image: 'https://picsum.photos/seed/prada1/600/800',
    discount: 30,
  },
  {
    id: '3',
    brand: 'Saint Laurent',
    name: 'Loulou Small Bag in Quilted Leather',
    originalPrice: 2590,
    ourPrice: 1899,
    image: 'https://picsum.photos/seed/ysl1/600/800',
    discount: 27,
  },
  {
    id: '4',
    brand: 'Balenciaga',
    name: 'Le Cagole XS Shoulder Bag',
    originalPrice: 1890,
    ourPrice: 1299,
    image: 'https://picsum.photos/seed/balenciaga1/600/800',
    discount: 31,
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center bg-black text-white">
        <div className="absolute inset-0 opacity-40">
          <Image
            src="https://picsum.photos/seed/hero/1920/1080"
            alt="Luxury Fashion"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="font-playfair text-5xl md:text-7xl mb-4 tracking-wider">
            DIRTY APPLE
          </h1>
          <p className="font-inter text-xl md:text-2xl font-light tracking-wide mb-8">
            Curated Luxury, Uncovered Prices
          </p>
          <Link
            href="/shop"
            className="inline-block bg-white text-black px-8 py-3 font-inter text-sm tracking-widest hover:bg-gray-200 transition-colors"
          >
            SHOP NOW
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop?category=${category.slug}`}
                className="group relative aspect-[4/5] overflow-hidden"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-playfair text-2xl tracking-widest">
                    {category.name.toUpperCase()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl text-center mb-4">Featured Finds</h2>
          <p className="text-gray text-center mb-12 font-inter font-light">
            Hand-picked luxury at exceptional prices
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 discount-badge px-2 py-1 text-xs font-inter">
                    -{product.discount}%
                  </div>
                </div>
                <p className="text-gray text-xs tracking-widest mb-1">{product.brand}</p>
                <h3 className="font-playfair text-lg mb-2 line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="font-inter font-semibold">${product.ourPrice.toLocaleString()}</span>
                  <span className="price-original text-sm">${product.originalPrice.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/shop"
              className="inline-block border border-black px-8 py-3 font-inter text-sm tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              VIEW ALL
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-black flex items-center justify-center">
                <span className="font-playfair text-2xl">1</span>
              </div>
              <h3 className="font-playfair text-xl mb-3">We Source</h3>
              <p className="font-inter text-gray font-light">
                We curate the finest luxury items from top retailers and resellers worldwide.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-black flex items-center justify-center">
                <span className="font-playfair text-2xl">2</span>
              </div>
              <h3 className="font-playfair text-xl mb-3">We Verify</h3>
              <p className="font-inter text-gray font-light">
                Every item is authenticated and quality-checked to ensure authenticity.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border border-black flex items-center justify-center">
                <span className="font-playfair text-2xl">3</span>
              </div>
              <h3 className="font-playfair text-xl mb-3">You Save</h3>
              <p className="font-inter text-gray font-light">
                Get luxury at up to 40% off retail prices, delivered to your door.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
