import Link from 'next/link';
import Image from 'next/image';

interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes: string[];
  retailerSource: string;
  inStock: boolean;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product._id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
        <Image
          src={product.images?.[0] || 'https://picsum.photos/seed/default/600/800'}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.discount > 0 && (
          <div className="absolute top-3 right-3 discount-badge px-2 py-1 text-xs font-inter">
            -{product.discount}%
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-inter text-sm tracking-widest">SOLD OUT</span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray text-xs tracking-widest mb-1">{product.brand}</p>
          <h3 className="font-playfair text-sm md:text-base line-clamp-2 mb-2">{product.name}</h3>
          <div className="flex items-center gap-2">
            <span className="font-inter font-semibold">${product.ourPrice.toLocaleString()}</span>
            <span className="price-original text-sm">${product.originalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
