import Link from 'next/link';
import { Product, money } from '@/lib/catalog';

export default function ProductCard({ product }: { product: Product }) {
  const href = '/product/' + encodeURIComponent(product.slug || product._id);
  const imgSrc = product.images?.[0];

  return (
    <Link href={href} className="product-object">
      <div className="product-object-photo">
        {imgSrc ? <img src={imgSrc} alt={product.name} loading="lazy" /> : <div className="product-object-unavailable">Image unavailable</div>}
        {product.discount > 0 && <span className="product-object-discount">−{product.discount}%</span>}
        {product.inStock === false && <div className="product-object-sold">SOLD OUT</div>}
      </div>
      <div className="product-object-details">
        <p className="product-object-brand">{product.brand.toUpperCase()}</p>
        <h3>{product.name}</h3>
        <div className="product-object-price"><span>{money(product.ourPrice, product.currency)}</span>{product.originalPrice > product.ourPrice && <s>{money(product.originalPrice, product.currency)}</s>}</div>
        {product.purchaseMode === 'external' && <p className="product-object-retailer">At {product.retailerSource}</p>}
      </div>
    </Link>
  );
}
