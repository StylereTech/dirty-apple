import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  product: mongoose.Types.ObjectId;
  sourcePrice: number;
  ourPrice: number;
  retailer: string;
  recordedAt: Date;
  priceChange: number; // percentage change from previous
  isFlashDeal: boolean;
}

const PriceHistorySchema = new Schema<IPriceHistory>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  sourcePrice: { type: Number, required: true },
  ourPrice: { type: Number, required: true },
  retailer: { type: String, required: true },
  recordedAt: { type: Date, default: Date.now },
  priceChange: { type: Number, default: 0 },
  isFlashDeal: { type: Boolean, default: false },
});

PriceHistorySchema.index({ product: 1, recordedAt: -1 });

export const PriceHistory = mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
