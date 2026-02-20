import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  brand: string;
  category: string;
  description: string;
  originalPrice: number;
  ourPrice: number;
  discount: number;
  images: string[];
  sizes: string[];
  retailerSource: string;
  retailerUrl: string;
  affiliateUrl?: string;
  inStock: boolean;
  lastScraped: Date;
  sku: string;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  originalPrice: { type: Number, required: true },
  ourPrice: { type: Number, required: true },
  discount: { type: Number, required: true },
  images: [{ type: String }],
  sizes: [{ type: String }],
  retailerSource: { type: String, required: true },
  retailerUrl: { type: String, required: true },
  affiliateUrl: { type: String },
  inStock: { type: Boolean, default: true },
  lastScraped: { type: Date, default: Date.now },
  sku: { type: String, required: true, unique: true },
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
