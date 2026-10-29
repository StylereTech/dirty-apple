// Keep one checkout implementation so all consumers use server-calculated totals,
// a private cart session and confirmed orders.
export { default, default as StripeCheckout } from './CheckoutPayment';
