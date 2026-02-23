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
  originalPrice: { type: Number, required: true },
  ourPrice: { type: Number, required: true },
  discount: { type: Number, required: true },
  images: [{ type: String }],
  sizes: [{ size: String, available: { type: Boolean, default: true } }],
  colors: [{ type: String }],
  retailerSource: { type: String, required: true },
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

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
