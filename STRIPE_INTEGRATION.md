# Dirty Apple - Stripe Connect Integration Design

## Overview

This document outlines the Stripe integration architecture for Dirty Apple, a marketplace/aggregator platform where customers pay Dirty Apple, and we handle fulfillment or redirect to retailers while earning a spread.

---

## Architecture

### Two Payment Flows

#### 1. Affiliate Redirect Flow
```
Customer → Dirty Apple (payment) → Redirect to Retailer (affiliate link)
                                    ↓
                         Retailer tracks & pays commission
```
- Customer pays Dirty Apple full price
- After payment, redirect customer to retailer's site with affiliate tracking
- We keep the difference between our price and retailer's price as commission
- **Use case**: When we don't fulfill the order directly

#### 2. Direct Fulfillment Flow
```
Customer → Dirty Apple (payment) → We order from retailer → Ship to customer
                                    ↓
                         We pay retailer their wholesale price
```
- Customer pays Dirty Apple
- We place order with retailer (API or manually)
- We handle shipping/delivery (via Shipday/DoorDash)
- We keep the spread (retail price - wholesale price - shipping)

---

## Financial Split

| Flow | Customer Pays | Affiliate Commission | Retailer Payout | Platform Revenue |
|------|---------------|---------------------|-----------------|------------------|
| Affiliate | $100 | $15 (to affiliate network) | $0 | $85 |
| Direct | $100 | $0 | $60 (wholesale) | $40 - shipping |

---

## File Structure

```
dirty-apple/
├── server/src/
│   ├── lib/
│   │   └── stripe.ts          # Server-side Stripe utilities
│   └── routes/
│       └── checkout.ts         # Checkout & webhook endpoints
│
├── frontend/src/
│   ├── lib/
│   │   └── stripe/
│   │       └── client.ts      # Client-side Stripe config
│   └── components/
│       └── checkout/
│           └── StripeCheckout.tsx  # React checkout component
```

---

## API Endpoints

### POST /api/checkout
Create payment intent with marketplace metadata.

**Request:**
```json
{
  "items": [{ "productId": "...", "price": 29.99, "originalPrice": 49.99, "retailerId": "..." }],
  "customer": { "email": "..." },
  "flowType": "direct_fulfillment" // or "affiliate_redirect"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "total": 44.99,
  "platformRevenue": 14.99,
  "flowType": "direct_fulfillment"
}
```

### POST /api/checkout/confirm
Confirm payment and create order. Returns redirect URL for affiliate flow.

### POST /api/checkout/webhook
Handles Stripe webhooks for payment events.

### POST /api/checkout/affiliate-link
Generates affiliate redirect links.

---

## Security Requirements

### Environment Variables
```bash
# Server (Express on port 4000)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Frontend (Next.js on port 3000)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Security Measures
1. **Never expose secret keys client-side** - Only publishable key in frontend
2. **Validate amounts server-side** - Reject amounts < $0.50 or > $999,999.99
3. **Idempotency keys** - Prevent duplicate charges
4. **Webhook signature verification** - Verify all webhook events
5. **Financial validation** - Ensure platform revenue = total - commissions - payouts

---

## Stripe Connect (Future)

For paying retailers directly (instead of affiliate model), you'd use Stripe Connect:

### Express Accounts
- Retailers onboard via Stripe Express
- We can transfer funds to their connected account
- They see a simplified Stripe dashboard

### Implementation
```typescript
// Create connected account for retailer
const { accountId, onboardingUrl } = await createConnectAccount(
  retailer.email,
  retailer.businessName
);

// Transfer to retailer after fulfillment
await createTransferToRetailer(
  retailerPayoutAmount,
  connectedAccountId,
  orderId
);
```

---

## Limitations

### Current Model Limitations

1. **Refund complexity**: When refunding, must reverse affiliate commissions and retailer payouts proportionally
2. **Chargeback risk**: As merchant of record, we bear fraud risk
3. **Tax compliance**: Need to handle sales tax collection/remittance (Stripe Tax integration)
4. **Platform fees**: Stripe fees (2.9% + $0.30) reduce margin
5. **Payout timing**: Stripe payouts have 2-7 day rolling window

### Stripe Limitations

1. **No native affiliate tracking**: Need external affiliate network
2. **Limited split payments**: Connect required for direct retailer payouts
3. **Webhook retries**: Need idempotency (already implemented)
4. **Currency**: Only USD in current setup (would need currency conversion for international)

---

## Dependencies

```bash
# Server
npm install stripe

# Frontend  
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

## Next Steps

1. **Environment setup**: Configure Stripe keys in .env
2. **Test webhooks**: Use Stripe CLI for local testing
3. **Affiliate integration**: Connect to affiliate network (Impact, ShareASale)
4. **Fulfillment integration**: Wire up Shipday/DoorDash for direct fulfillment
5. **Tax calculation**: Enable Stripe Tax for automatic tax handling
6. **Payout automation**: Set up Stripe Connect for retailer payouts

