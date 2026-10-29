import mongoose, { Schema, Document } from 'mongoose';
import { randomBytes } from 'node:crypto';

export interface IOrder extends Document {
  orderNumber: string;
  items: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    originalPrice: number;
    name: string;
    brand: string;
    image: string;
    size: string;
    spread: number;
  }>;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  costBasis: number;
  profit: number;
  stripePaymentId: string;
  stripeSessionId?: string;
  sessionHash?: string;
  accessTokenHash?: string;
  checkoutKeyHash?: string;
  requestDigest?: string;
  refundedAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  sourceOrders: Array<{
    retailer: string;
    orderId?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status: string;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String, required: true, unique: true,
    default: () => `DA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(6).toString('hex').toUpperCase()}`,
  },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    name: { type: String, required: true },
    brand: { type: String },
    image: { type: String },
    size: { type: String },
    spread: { type: Number, default: 0 },
  }],
  customer: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, default: 'US' },
    },
  },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  costBasis: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  stripePaymentId: { type: String },
  stripeSessionId: { type: String },
  sessionHash: { type: String, select: false },
  accessTokenHash: { type: String, select: false },
  checkoutKeyHash: { type: String, select: false },
  requestDigest: { type: String, select: false },
  refundedAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
  fulfillmentStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  sourceOrders: [{
    retailer: { type: String },
    orderId: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    status: { type: String, default: 'pending' },
  }],
  notes: { type: String },
}, { timestamps: true });

OrderSchema.index({ stripePaymentId: 1 }, { unique: true, partialFilterExpression: { stripePaymentId: { $type: 'string' } } });
OrderSchema.index({ checkoutKeyHash: 1 }, { unique: true, partialFilterExpression: { checkoutKeyHash: { $type: 'string' } } });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
