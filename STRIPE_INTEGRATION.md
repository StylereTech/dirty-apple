# Stripe integration

Current implementation reference: [deployment and direct-checkout gates](docs/DEPLOYMENT.md#direct-checkout).

External retailer listings use retailer links and never enter Dirty Apple Stripe checkout. Direct checkout is disabled by default (`DIRECT_CHECKOUT_ENABLED=false`). The historical charge-then-affiliate-redirect design is not implemented or supported.

## Direct checkout contract

All cart and checkout requests require a random UUID `X-Session-Id`. `POST /api/checkout` also requires an `Idempotency-Key` UUID, a list of `{productId, quantity, size}` and customer shipping details. The server loads product prices from MongoDB and creates a durable pending order before requesting a Stripe PaymentIntent. Client prices and totals are ignored.

The result includes `clientSecret`, `paymentIntentId`, `paymentStatus`, `orderId`, `orderAccessToken`, `subtotal`, `shipping`, `tax` and `total`. Review changed server totals before confirming payment. Reuse the same idempotency key only for retries of the same request; changed items or customer details require a new explicit checkout attempt.

`POST /api/checkout/confirm` accepts `{paymentIntentId, orderAccessToken}` with the same session header. It verifies the stored order, intent ID, order metadata, USD currency, exact amount received and successful payment before returning a sanitized order. A failed confirmation is retried without charging again. Closed checkouts return410; they do not automatically initiate another payment.

## Webhooks

Use `/api/webhooks/stripe`; `/api/checkout/webhook` remains a compatibility alias. Both require the configured `STRIPE_WEBHOOK_SECRET` and preserve raw request bytes before JSON parsing. Implemented events handle PaymentIntent success/failure and charge refunds. Partial refunds update the refund amount; they do not incorrectly mark the whole payment refunded or erase shipment history.

Customer order reads require both `X-Session-Id` and `X-Order-Token`. Order lists and fulfillment updates require administrator authentication. Client-provided paymentStatus changes are rejected.

The frontend API proxy forwards session, order-token, idempotency and signature headers and preserves webhook body bytes.

## Validation and limits

Repository tests mock Stripe and never create real charges. Before enabling direct checkout, verify live test-mode webhook delivery, payment success/failure/retry/refund behavior and stock/fulfillment operations in staging. The existing simple shipping rule and zero-tax quotation still require operational tax/shipping implementation. No automated retailer purchasing, confirmation email service or affiliate commissions are connected.
