import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  items: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    name: string;
    brand: string;
    image: string;
    size: string;
  }>;
  customer: {
    name: string;
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
  total: number;
  stripePaymentId: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  sourceOrders: Array<{
    retailer: string;
    orderId: string;
    trackingUrl?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    brand: { type: String },
    image: { type: String },
    size: { type: String },
  }],
  customer: {
    name: { type: String, required: true },
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
  total: { type: Number, required: true },
  stripePaymentId: { type: String },
  status: { type: String, enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  sourceOrders: [{
    retailer: { type: String },
    orderId: { type: String },
    trackingUrl: { type: String },
  }],
}, { timestamps: true });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
