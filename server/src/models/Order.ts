import mongoose, { Schema, Document } from 'mongoose';

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
  orderNumber: { type: String, required: true, unique: true },
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

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });

// Generate order number before save
OrderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `DA-${dateStr}-${rand}`;
  }
  next();
});

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
