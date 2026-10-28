import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapeJob extends Document {
  jobId: string;
  retailer: string;
  category?: string;
  url?: string;
  sourceType: 'feed' | 'scrape';
  maxPages: number;
  pagesVisited: number;
  truncated: boolean;
  activeRetailer?: string;
  leaseExpiresAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  productsFound: number;
  productsSaved: number;
  errorMessages: string[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapeJobSchema = new Schema<IScrapeJob>({
  jobId: { type: String, required: true, unique: true, index: true },
  retailer: { type: String, required: true, index: true },
  category: { type: String },
  url: { type: String },
  sourceType: { type: String, enum: ['feed', 'scrape'], default: 'scrape' },
  maxPages: { type: Number, min: 1, max: 10, default: 5 },
  pagesVisited: { type: Number, default: 0 },
  truncated: { type: Boolean, default: false },
  activeRetailer: { type: String },
  leaseExpiresAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed'], 
    default: 'pending',
    index: true 
  },
  productsFound: { type: Number, default: 0 },
  productsSaved: { type: Number, default: 0 },
  errorMessages: [{ type: String }],
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

ScrapeJobSchema.index({ createdAt: -1 });
ScrapeJobSchema.index({ status: 1, createdAt: -1 });
ScrapeJobSchema.index({ activeRetailer: 1 }, { unique: true, sparse: true });

export const ScrapeJob = mongoose.model<IScrapeJob>('ScrapeJob', ScrapeJobSchema);
