# Dirty Apple

Curated Luxury, Uncovered Prices - A luxury fashion resale aggregator platform.

## Overview

Dirty Apple is a luxury fashion aggregator that curates the finest items from top retailers worldwide, offering authenticated luxury at exceptional prices.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Database**: MongoDB with Mongoose
- **Payments**: Stripe

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Stripe account (test mode)

### Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy environment variables
cp ../.env.example .env
# Edit .env with your configuration

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp ../.env.example .env.local
# Edit .env.local with your configuration

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

### Seeding Data

```bash
cd server
npm run seed
```

## Project Structure

```
dirty-apple/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   │   ├── shop/       # Shop page
│   │   │   ├── product/    # Product detail
│   │   │   ├── cart/       # Cart page
│   │   │   ├── checkout/   # Checkout page
│   │   │   └── about/      # About page
│   │   └── components/     # React components
│   └── package.json
├── server/                   # Express backend
│   ├── src/
│   │   ├── models/         # Mongoose models
│   │   ├── routes/        # API routes
│   │   └── scrapers/      # Retailer scraper stubs
│   └── package.json
├── .env.example
├── vercel.json
└── Dockerfile
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 4000) |
| `MONGODB_URI` | MongoDB connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## Features

- Browse luxury fashion by category, brand, and price
- Advanced filtering and sorting
- Full product details with size selection
- Shopping cart with quantity management
- Stripe checkout integration
- Order tracking

## Deployment

### Frontend (Vercel)

Connect the repository to Vercel. The `vercel.json` configures the build settings.

### Backend (Docker)

```bash
# Build the image
docker build -t dirty-apple-server .

# Run the container
docker run -p 4000:4000 --env-file .env dirty-apple-server
```

## License

MIT
