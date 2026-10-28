import Stripe from 'stripe';
import { IOrder, Order } from '../models/Order';
import { CommerceError } from './commerce';
import { getStripeServer } from './stripe';

/** Excludes internal margin data, payment IDs, and access/session hashes. */
export function publicOrder(order: any) {
  return {
    _id: String(order._id), orderNumber: order.orderNumber,
    items: order.items.map((item: any) => ({
      product: item.product, quantity: item.quantity, price: item.price, originalPrice: item.originalPrice,
      name: item.name, brand: item.brand, image: item.image, size: item.size,
    })),
    customer: order.customer, subtotal: order.subtotal, shipping: order.shipping,
    tax: order.tax, total: order.total, paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus, refundedAmount: order.refundedAmount,
    sourceOrders: order.sourceOrders, createdAt: order.createdAt,
  };
}

export function verifyPaidIntent(order: IOrder, intent: Stripe.PaymentIntent) {
  const expectedAmount = Math.round(order.total * 100);
  if (intent.status !== 'succeeded') throw new CommerceError('Payment is not confirmed', 409);
  if (intent.id !== order.stripePaymentId || intent.metadata.orderId !== String(order._id)
      || intent.currency !== 'usd' || intent.amount !== expectedAmount || intent.amount_received !== expectedAmount) {
    throw new CommerceError('Payment does not match this order', 409);
  }
}

export async function recordPayment(order: IOrder, intent: Stripe.PaymentIntent) {
  verifyPaidIntent(order, intent);
  // Never regress a shipped order or overwrite a completed refund on a replayed event.
  if (order.paymentStatus === 'refunded') return order;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, stripePaymentId: intent.id, paymentStatus: { $in: ['pending', 'failed'] } },
    { $set: { paymentStatus: 'paid' } }, { new: true, runValidators: true },
  );
  return updated || await Order.findById(order._id) || order;
}

/** Closing fulfillment must also retire a previously issued, unpaid client secret. */
export async function cancelPendingPayment(order: IOrder, knownIntent?: Stripe.PaymentIntent) {
  if (!order.stripePaymentId || order.paymentStatus === 'refunded') return order;
  const stripe = getStripeServer();
  const intent = knownIntent || await stripe.paymentIntents.retrieve(order.stripePaymentId);
  if (intent.id !== order.stripePaymentId || intent.metadata.orderId !== String(order._id)
      || intent.currency !== 'usd' || intent.amount !== Math.round(order.total * 100)) {
    throw new CommerceError('Payment does not match this order', 409);
  }
  if (intent.status === 'succeeded') return recordPayment(order, intent);
  if (intent.status !== 'canceled') {
    await stripe.paymentIntents.cancel(intent.id, { cancellation_reason: 'requested_by_customer' }, { idempotencyKey: `cancel-${order._id}` });
  }
  return await Order.findOneAndUpdate(
    { _id: order._id, stripePaymentId: intent.id, paymentStatus: { $in: ['pending', 'failed'] } },
    { $set: { paymentStatus: 'failed' } }, { new: true, runValidators: true },
  ) || order;
}
