# Dirty Apple — Curated Luxury Resale Platform
## Full Architecture & Roadmap

_Created: Feb 20, 2026_

---

## 🎯 Core Concept

Aggregate high-end fashion from top retailers + vetted boutiques. Relist at markup. Pocket the spread. Automate everything.

**Revenue Streams:**
1. **Markup spread** — Buy at sale price, sell at "curated" price (15-40% margin)
2. **Affiliate commissions** — Join retailer affiliate programs (5-15% per sale)
3. **Boutique partner fees** — Boutiques pay to list on platform (monthly or % of sales)
4. **SEO/content traffic** → ad revenue on blog

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) + TailwindCSS | SSR for SEO, fast, luxury feel |
| **Backend** | Node.js + Express (or Next.js API routes) | JS ecosystem consistency |
| **Database** | MongoDB Atlas | Flexible product schemas, fast reads |
| **Cache** | Redis | Price cache, session store, rate limiting |
| **Search** | Meilisearch or Algolia | Instant product search, faceted filtering |
| **Payments** | Stripe Connect | Marketplace payments, split payouts |
| **Image CDN** | Cloudinary or imgix | Resize, optimize, lazy-load product images |
| **Scraping** | Playwright + proxy rotation (Bright Data) | Anti-detection, JS rendering |
| **Queue** | BullMQ (Redis-backed) | Job scheduling: scraping, price updates, order routing |
| **Hosting** | Vercel (frontend) + AWS (scraping infra) | Edge performance + heavy compute separate |
| **Monitoring** | Sentry + Datadog | Error tracking, uptime |
| **Email** | Resend or SendGrid | Transactional + marketing |
| **Analytics** | GA4 + Mixpanel | Traffic + user behavior |

---

## 🧱 Site Architecture

```
dirty-apple/
├── app/                          # Next.js App Router
│   ├── (shop)/                   # Customer-facing
│   │   ├── page.tsx              # Homepage — hero, featured, trending deals
│   │   ├── products/
│   │   │   ├── page.tsx          # Browse/search with filters
│   │   │   └── [slug]/page.tsx   # Product detail page (SEO-optimized)
│   │   ├── collections/
│   │   │   └── [slug]/page.tsx   # Curated collections (e.g., "Saks Under $200")
│   │   ├── cart/page.tsx         # Shopping cart
│   │   ├── checkout/page.tsx     # Stripe checkout
│   │   └── orders/
│   │       ├── page.tsx          # Order history
│   │       └── [id]/page.tsx     # Order tracking
│   ├── (blog)/
│   │   ├── blog/page.tsx         # Blog listing
│   │   └── blog/[slug]/page.tsx  # Blog post (SEO content)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── account/page.tsx
│   ├── (partners)/
│   │   ├── affiliate/page.tsx    # Boutique/store affiliate dashboard
│   │   ├── affiliate/apply/      # Application form
│   │   └── affiliate/analytics/  # Commission tracking
│   └── (admin)/
│       ├── dashboard/            # Admin overview
│       ├── products/             # Product management
│       ├── orders/               # Order routing & tracking
│       ├── scrapers/             # Scraper status & controls
│       ├── pricing/              # Markup rules engine
│       └── partners/             # Affiliate management
├── server/
│   ├── models/
│   │   ├── Product.ts            # Product schema
│   │   ├── Order.ts              # Order with routing info
│   │   ├── Source.ts             # Retailer/boutique sources
│   │   ├── PriceHistory.ts       # Price tracking over time
│   │   ├── Affiliate.ts          # Partner stores
│   │   └── User.ts
│   ├── services/
│   │   ├── scraper/
│   │   │   ├── ScraperOrchestrator.ts  # Manages all scraper jobs
│   │   │   ├── scrapers/
│   │   │   │   ├── SaksScraper.ts
│   │   │   │   ├── NeimanScraper.ts
│   │   │   │   ├── BloomingdalesScraper.ts
│   │   │   │   ├── NordstromScraper.ts
│   │   │   │   ├── ShopifyScraper.ts   # Generic Shopify store scraper
│   │   │   │   └── GenericScraper.ts   # Fallback
│   │   │   ├── ProxyManager.ts         # Rotate residential proxies
│   │   │   └── AntiDetection.ts        # Fingerprint randomization
│   │   ├── pricing/
│   │   │   ├── PricingEngine.ts        # Markup calculation
│   │   │   ├── MarkdownDetector.ts     # Flash sale/clearance detection
│   │   │   └── CompetitorWatch.ts      # Monitor competitor pricing
│   │   ├── orders/
│   │   │   ├── OrderRouter.ts          # Route to correct seller
│   │   │   ├── AffiliateHandler.ts     # Process affiliate orders
│   │   │   ├── DirectPurchaser.ts      # Auto-buy from retailer
│   │   │   └── TrackingSync.ts         # Pull tracking from sellers
│   │   ├── inventory/
│   │   │   ├── StockChecker.ts         # Real-time availability
│   │   │   └── AutoRemover.ts          # Remove sold-out items
│   │   └── seo/
│   │       ├── SitemapGenerator.ts
│   │       ├── MetaGenerator.ts
│   │       └── BlogEngine.ts
│   ├── jobs/                           # BullMQ job definitions
│   │   ├── scrapeProducts.ts           # Cron: scrape all sources
│   │   ├── updatePrices.ts             # Cron: refresh prices
│   │   ├── checkInventory.ts           # Cron: stock check
│   │   ├── routeOrders.ts              # Process pending orders
│   │   └── generateContent.ts          # AI blog post generation
│   └── api/
│       ├── products.ts
│       ├── orders.ts
│       ├── cart.ts
│       ├── affiliates.ts
│       └── webhooks/
│           ├── stripe.ts
│           └── tracking.ts
└── scripts/
    ├── seedSources.ts                  # Initial retailer setup
    ├── testScraper.ts                  # Scraper validation
    └── importBoutiques.ts              # Bulk boutique import
```

---

## 📦 Key Data Models

### Product
```typescript
{
  _id: ObjectId,
  slug: string,                    // SEO-friendly URL
  title: string,                   // "Gucci GG Marmont Bag"
  brand: string,                   // "Gucci"
  description: string,
  images: string[],                // CDN URLs
  category: string,                // "Bags", "Shoes", "Dresses"
  subcategory: string,
  sizes: [{ size: string, available: boolean }],
  colors: string[],

  // Pricing
  originalPrice: number,           // Retailer's full price
  sourcePrice: number,             // Current price at source (may be on sale)
  dirtyApplePrice: number,         // Our price (markup applied)
  markup: number,                  // Percentage markup
  currency: "USD",

  // Source tracking
  source: {
    retailer: string,              // "saks", "nordstrom", etc.
    url: string,                   // Original product URL
    affiliateUrl?: string,         // Affiliate link if available
    isAffiliate: boolean,
    lastScraped: Date,
    lastPriceChange: Date,
  },

  // Markdown detection
  isOnSale: boolean,
  salePercentage: number,          // 40% off at source
  isFlashDeal: boolean,
  isClearance: boolean,
  priceHistory: [{ price: number, date: Date }],

  // SEO
  metaTitle: string,
  metaDescription: string,
  keywords: string[],

  // Status
  status: "active" | "sold_out" | "delisted" | "draft",
  featured: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### Order
```typescript
{
  _id: ObjectId,
  orderNumber: string,             // "DA-20260220-001"
  customer: { name, email, address, phone },

  items: [{
    product: ObjectId,
    size: string,
    quantity: number,
    dirtyApplePrice: number,       // What customer paid
    sourcePrice: number,           // What we pay
    spread: number,                // Our profit
  }],

  // Financials
  subtotal: number,
  shipping: number,
  tax: number,
  total: number,                   // Customer pays
  costBasis: number,               // Our cost
  profit: number,                  // Spread

  // Payment
  stripePaymentId: string,
  paymentStatus: "pending" | "paid" | "refunded",

  // Order routing
  routingStatus: "pending" | "ordered" | "shipped" | "delivered" | "failed",
  sourceOrders: [{                 // May split across retailers
    retailer: string,
    sourceOrderId: string,
    trackingNumber: string,
    trackingUrl: string,
    status: string,
    isAffiliate: boolean,
  }],

  createdAt: Date,
  updatedAt: Date,
}
```

---

## 💰 Pricing Engine

```
Source Price → Markup Rules → Dirty Apple Price

Rules:
1. Base markup: 25% on sale items, 15% on full-price
2. Brand premium: +10% on Gucci, Prada, LV, Chanel, Hermès
3. Clearance bonus: If source is 50%+ off → markup 35-40% (still cheaper than original)
4. Flash deal: Temporary higher markup (40%) since urgency
5. Affiliate items: Lower markup (10-15%) since we earn commission too
6. Floor: Never sell below source price + shipping + 5% buffer
7. Ceiling: Never exceed 90% of original retail (must feel like a deal)
```

**Markdown Detection:**
- Scrape prices every 6 hours
- Compare against `priceHistory`
- Flag items where `currentPrice < lastPrice * 0.85` (15%+ drop)
- Auto-feature flash deals on homepage
- Alert admin for clearance items (50%+ off) → bulk buy opportunity

---

## 🔄 Order Flow (Invisible to Customer)

```
Customer browses → Adds to cart → Checkout (Stripe) → Payment captured
                                                          ↓
                                              OrderRouter determines:
                                              ├─ Affiliate? → Redirect purchase through affiliate link
                                              ├─ Direct buy? → Auto-purchase from retailer (Playwright bot)
                                              └─ Manual? → Admin notified to place order
                                                          ↓
                                              Tracking number obtained
                                                          ↓
                                              Customer gets "shipped" email with tracking
                                                          ↓
                                              Delivery confirmed → Order complete
```

**Key: Customer never knows we're an aggregator.** They think they're buying from Dirty Apple.

---

## 🤝 Affiliate/Partner Dashboard

### For Boutiques:
- Apply to join → admin vets quality
- Once approved: upload products or connect Shopify store
- Dashboard shows: impressions, clicks, sales, commission earned
- Commission: 10-15% of sale price
- Payout: Monthly via Stripe Connect

### For Retailers (Affiliate Programs):
| Retailer | Affiliate Program | Commission |
|----------|------------------|------------|
| Saks Fifth Avenue | Rakuten/CJ | 5-8% |
| Neiman Marcus | Rakuten | 5-7% |
| Nordstrom | Rakuten/Impact | 5-11% |
| Bloomingdale's | Rakuten | 5-8% |
| Net-a-Porter | CJ/Awin | 6-10% |
| Farfetch | Awin/Rakuten | 7-10% |
| SSENSE | Impact | 5-8% |
| Mytheresa | CJ | 8-12% |

---

## 🔍 SEO Strategy

### Product Pages:
```
URL: dirtyapple.com/products/gucci-gg-marmont-quilted-mini-bag-black
Title: "Gucci GG Marmont Mini Bag Black - Up to 40% Off | Dirty Apple"
Meta: "Shop the Gucci GG Marmont quilted mini bag in black at up to 40% off retail. Authentic luxury fashion at markdown prices. Free shipping."
```

### Blog Content (AI-Generated):
- "Best Saks Fifth Avenue Sale Finds This Week"
- "Nordstrom Anniversary Sale 2026: What to Buy"
- "How to Spot Fake vs Authentic Designer Bags"
- "Top 10 Luxury Markdowns Under $200"
- "Bloomingdale's Clearance: Hidden Gems"

### Target Keywords:
- "luxury markdowns", "saks sale", "nordstrom sale finds"
- "designer bags on sale", "luxury fashion deals"
- "[brand] sale", "[brand] outlet online"
- "authentic luxury resale", "curated luxury deals"

---

## ⚠️ Legal & Scraping Risks

### 🔴 HIGH RISK:
1. **Scraping ToS violations** — Most retailers explicitly prohibit scraping
   - **Mitigation:** Use affiliate APIs where available (Rakuten, CJ, Impact provide product feeds)
   - **Mitigation:** Rotate residential proxies, randomize patterns, respect robots.txt
   - **Mitigation:** Keep scraping frequency reasonable (not hammering servers)

2. **Trademark/brand issues** — Using brand names and images
   - **Mitigation:** First sale doctrine protects resale of genuine goods
   - **Mitigation:** Don't claim to be authorized retailer
   - **Mitigation:** Add disclaimer: "Dirty Apple is not affiliated with [brands]"

3. **Image copyright** — Using retailer product images
   - **Mitigation:** Use affiliate program product feeds (they provide images for this purpose)
   - **Mitigation:** For non-affiliate sources, consider transformative use or own photography

### 🟡 MEDIUM RISK:
4. **Auto-purchasing bots** — Some retailers ban automated purchases
   - **Mitigation:** Manual ordering for high-value items
   - **Mitigation:** Use different payment methods/addresses

5. **Price manipulation claims** — Showing inflated "original" prices
   - **Mitigation:** Always show actual retailer price, not MSRP
   - **Mitigation:** Be transparent about markup

### 🟢 LOW RISK:
6. **Affiliate program compliance** — Must follow program rules
   - **Mitigation:** Disclose affiliate relationships
   - **Mitigation:** Don't bid on brand name keywords in PPC

### Recommendation:
**Start with affiliate-first approach.** Join all retailer affiliate programs. Use their product feeds (legal, free images, structured data). Only scrape for price monitoring and flash deal detection. This is 80% of the value with 20% of the risk.

---

## 🗓️ Roadmap

### Phase 1: MVP (Weeks 1-3)
- [ ] Next.js project setup with TailwindCSS
- [ ] MongoDB models (Product, Order, User, Source)
- [ ] Join 3-4 affiliate programs (Nordstrom, Saks, Farfetch, SSENSE)
- [ ] Import affiliate product feeds (no scraping needed)
- [ ] Product listing pages with search/filter
- [ ] Product detail pages (SEO-optimized)
- [ ] Cart + Stripe checkout
- [ ] Basic order routing (affiliate redirect)
- [ ] Homepage with featured products
- [ ] Mobile-first luxury design (black/gold)
- [ ] Deploy to Vercel

### Phase 2: Pricing & Automation (Weeks 4-6)
- [ ] Pricing engine with markup rules
- [ ] Price monitoring scrapers (Playwright + proxies)
- [ ] Markdown/flash deal detection
- [ ] Auto-feature sale items
- [ ] Inventory sync (remove sold-out)
- [ ] Email flows (welcome, order confirmation, shipping)
- [ ] Blog with AI-generated content
- [ ] Sitemap + SEO optimization

### Phase 3: Boutique Partners (Weeks 7-9)
- [ ] Affiliate dashboard for boutiques
- [ ] Shopify store connector
- [ ] Application/vetting flow
- [ ] Commission tracking + payouts (Stripe Connect)
- [ ] Partner analytics

### Phase 4: Scale (Weeks 10-12)
- [ ] Auto-purchasing bot for direct buy items
- [ ] Advanced markdown detection (ML-based)
- [ ] Competitor price monitoring
- [ ] Social media integration (Instagram shopping)
- [ ] Email marketing / retargeting
- [ ] Performance optimization (edge caching, image CDN)

---

## 💵 Revenue Projections

| Month | Products | Orders/Day | AOV | Revenue | Margin | Profit |
|-------|----------|-----------|-----|---------|--------|--------|
| 1 | 500 | 2 | $150 | $9,000 | 20% | $1,800 |
| 3 | 2,000 | 8 | $175 | $42,000 | 22% | $9,240 |
| 6 | 5,000 | 20 | $200 | $120,000 | 25% | $30,000 |
| 12 | 15,000 | 50 | $225 | $337,500 | 25% | $84,375 |

Plus affiliate commissions (~5-10% on routed orders).

---

## 🎨 Design Direction

- **Primary:** #000000 (black)
- **Accent:** #D4AF37 (gold)
- **Text:** #FFFFFF / #B0B0B0
- **Font:** Cormorant Garamond (headings) + Inter (body)
- **Aesthetic:** Minimal, editorial, high-fashion magazine feel
- **Inspiration:** Net-a-Porter, SSENSE, The RealReal
- **Mobile-first:** 70%+ traffic will be mobile

---

_This is v1 of the architecture. Iterate as we build._
