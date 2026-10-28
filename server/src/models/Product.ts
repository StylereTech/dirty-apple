import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory?: string;
  description: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes: { size: string; available: boolean }[];
  colors?: string[];
  retailerSource: string;
  retailerId?: string;
  externalProductId?: string;
  variantId?: string;
  purchaseMode: 'direct' | 'external';
  currency: 'USD';
  gender?: 'women' | 'men' | 'unisex' | 'kids';
  sourceType: 'manual' | 'feed' | 'scrape' | 'demo';
  lastVerifiedAt?: Date;
  finalSale: boolean;
  promotion?: string;
  retailerUrl: string;
  affiliateUrl?: string;
  inStock: boolean;
  featured: boolean;
  isOnSale: boolean;
  isClearance: boolean;
  lastScraped: Date;
  sku: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  collectionSlug?: string;
  status: 'active' | 'sold_out' | 'delisted' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  brand: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String },
  description: { type: String },
  originalPrice: { type: Number, required: true, min: 0.01 },
  ourPrice: { type: Number, required: true, min: 0.01 },
  discount: { type: Number, required: true, min: 0, max: 100 },
  images: [{ type: String }],
  sizes: [{ size: String, available: { type: Boolean, default: true } }],
  colors: [{ type: String }],
  retailerSource: { type: String, required: true },
  retailerId: { type: String, enum: ['saks', 'nordstrom', 'bloomingdales', 'mrporter', 'neiman', 'farfetch'] },
  externalProductId: { type: String },
  variantId: { type: String, default: '' },
  purchaseMode: { type: String, enum: ['direct', 'external'], default: 'direct' },
  currency: { type: String, enum: ['USD'], default: 'USD' },
  gender: { type: String, enum: ['women', 'men', 'unisex', 'kids'] },
  sourceType: { type: String, enum: ['manual', 'feed', 'scrape', 'demo'], default: 'manual' },
  lastVerifiedAt: { type: Date },
  finalSale: { type: Boolean, default: false },
  promotion: { type: String },
  retailerUrl: { type: String, required: true },
  affiliateUrl: { type: String },
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  isOnSale: { type: Boolean, default: false },
  isClearance: { type: Boolean, default: false },
  lastScraped: { type: Date, default: Date.now },
  sku: { type: String, required: true, unique: true },
  metaTitle: { type: String },
  metaDescription: { type: String },
  tags: [{ type: String }],
  collectionSlug: { type: String },
  status: { type: String, enum: ['active', 'sold_out', 'delisted', 'draft'], default: 'active' },
}, { timestamps: true });

ProductSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ ourPrice: 1 });
ProductSchema.index({ discount: -1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ collectionSlug: 1 });
ProductSchema.index({ retailerId: 1, externalProductId: 1, variantId: 1 }, {
  unique: true,
  partialFilterExpression: { retailerId: { $type: 'string' }, externalProductId: { $type: 'string' } },
});
ProductSchema.index({ status: 1, purchaseMode: 1, lastVerifiedAt: -1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
