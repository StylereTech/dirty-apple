import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  slug?: string;
  brand: string;
  category: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  retailerSource: string;
  inStock?: boolean;
}

export default function ProductCard({ product }: { product: Product }) {
  const href = product.slug ? `/product/${product.slug}` : `/product/${product._id}`;
  const imgSrc = product.images?.[0] || `https://picsum.photos/seed/${product._id}/600/800`;

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-full object-contain bg-white transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        {product.discount > 0 && (
          <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 font-inter text-[10px] tracking-wider">
            −{product.discount}%
          </div>
        )}
        {product.inStock === false && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-inter text-xs tracking-[0.2em]">SOLD OUT</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 font-inter text-[10px] text-gray-600">
          {product.retailerSource}
        </div>
      </div>
      <p className="text-gray-400 font-inter text-[10px] tracking-[0.2em] mb-0.5">{product.brand.toUpperCase()}</p>
      <h3 className="font-inter text-sm leading-tight line-clamp-2 mb-1.5 group-hover:text-gray-600 transition-colors">{product.name}</h3>
      <div className="flex items-center gap-2">
        <span className="font-inter text-sm font-medium">${Number(product.ourPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
        {product.originalPrice > product.ourPrice && (
          <span className="font-inter text-xs text-gray-400 line-through">${Number(product.originalPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
        )}
      </div>
    </Link>
  );
}
