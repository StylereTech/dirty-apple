import mongoose, { Schema } from 'mongoose';

const CartSchema = new Schema({
  sessionHash: { type: String, required: true, unique: true },
  items: [{
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    size: { type: String, required: true },
  }],
  expiresAt: { type: Date, required: true },
}, { timestamps: true, optimisticConcurrency: true });

CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Cart = mongoose.model('Cart', CartSchema);
