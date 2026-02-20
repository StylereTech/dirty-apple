import mongoose, { Schema, Document } from 'mongoose';

export interface IRetailer extends Document {
  name: string;
  baseUrl: string;
  scraperModule: string;
  hasAffiliate: boolean;
  affiliateNetwork?: string;
  markup: number;
}

const RetailerSchema = new Schema<IRetailer>({
  name: { type: String, required: true },
  baseUrl: { type: String, required: true },
  scraperModule: { type: String, required: true },
  hasAffiliate: { type: Boolean, default: false },
  affiliateNetwork: { type: String },
  markup: { type: Number, default: 0 },
});

export const Retailer = mongoose.model<IRetailer>('Retailer', RetailerSchema);
