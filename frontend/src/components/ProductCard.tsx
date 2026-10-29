import Link from 'next/link';
import { Product, money } from '@/lib/catalog';

export default function ProductCard({ product }: { product: Product }) {
  const href = `/product/${encodeURIComponent(product.slug || product._id)}`;
  const imgSrc = product.images?.[0];

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imgSrc ? <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-full object-contain bg-white transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        /> : <div className="h-full flex items-center justify-center p-4 text-center text-xs text-gray-500">Image unavailable</div>}
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
      </div>
      <p className="text-gray-400 font-inter text-[10px] tracking-[0.2em] mb-0.5">{product.brand.toUpperCase()}</p>
      <h3 className="font-inter text-sm leading-tight line-clamp-2 mb-1.5 group-hover:text-gray-600 transition-colors">{product.name}</h3>
      <div className="flex items-center gap-2">
        <span className="font-inter text-sm font-medium">{money(product.ourPrice, product.currency)}</span>
        {product.originalPrice > product.ourPrice && (
          <span className="font-inter text-xs text-gray-400 line-through">{money(product.originalPrice, product.currency)}</span>
        )}
      </div>
      {product.purchaseMode === 'external' && <p className="mt-1.5 text-xs text-gray-500">At {product.retailerSource}</p>}
    </Link>
  );
}
