import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './models/Product';
import { Retailer } from './models/Retailer';
import { PriceHistory } from './models/PriceHistory';

dotenv.config();

function slugify(brand: string, name: string): string {
  return `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sizes(type: 'bag' | 'shoes' | 'clothing' | 'accessories') {
  switch (type) {
    case 'bag': return [{ size: 'One Size', available: true }];
    case 'shoes': return ['36','37','38','39','40','41','42','43','44'].map(s => ({ size: s, available: true }));
    case 'clothing': return ['XS','S','M','L','XL'].map(s => ({ size: s, available: true }));
    case 'accessories': return [{ size: 'One Size', available: true }];
  }
}

const products = [
  // ===== BAGS (15) =====
  { name: 'GG Marmont Small Shoulder Bag', brand: 'Gucci', category: 'Bags', description: 'The small GG Marmont chain shoulder bag has a softly structured shape and an oversized flap closure with Double G hardware.', originalPrice: 2350, ourPrice: 1699, discount: 28, images: ['https://picsum.photos/seed/gucci-bag-1/800/1000','https://picsum.photos/seed/gucci-bag-1b/800/1000','https://picsum.photos/seed/gucci-bag-1c/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/gucci-gg-marmont', sku: 'GUCCI-BAG-001', featured: true, collectionSlug: 'editors-picks', tags: ['shoulder bag', 'leather', 'chain'] },
  { name: 'Re-Edition 2005 Saffiano Leather Bag', brand: 'Prada', category: 'Bags', description: 'This iconic Prada bag is reissued in Saffiano leather with the signature triangle logo.', originalPrice: 1850, ourPrice: 1299, discount: 30, images: ['https://picsum.photos/seed/prada-bag-1/800/1000','https://picsum.photos/seed/prada-bag-1b/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/prada-reedition', sku: 'PRADA-BAG-001', featured: true, collectionSlug: 'trending', tags: ['shoulder bag', 'saffiano'] },
  { name: 'Loulou Small Bag in Quilted Leather', brand: 'Saint Laurent', category: 'Bags', description: 'The Loulou Small features iconic YSL monogram hardware on quilted leather.', originalPrice: 2590, ourPrice: 1899, discount: 27, images: ['https://picsum.photos/seed/ysl-bag-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/ysl-loulou', sku: 'YSL-BAG-001', featured: true, collectionSlug: 'editors-picks', tags: ['quilted', 'monogram'] },
  { name: 'Le Cagole XS Shoulder Bag', brand: 'Balenciaga', category: 'Bags', description: 'Le Cagole features adjustable straps and signature hardware in aged buffalo leather.', originalPrice: 1890, ourPrice: 1299, discount: 31, images: ['https://picsum.photos/seed/balenciaga-bag-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/balenciaga-cagole', sku: 'BALENCIAGA-BAG-001', collectionSlug: 'trending', tags: ['edgy', 'hardware'] },
  { name: 'Cassette Bag in Intrecciato', brand: 'Bottega Veneta', category: 'Bags', description: 'Woven nappa leather cassette bag with magnetic closure.', originalPrice: 3200, ourPrice: 2400, discount: 25, images: ['https://picsum.photos/seed/bv-bag-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/bv-cassette', sku: 'BV-BAG-001', featured: true, collectionSlug: 'editors-picks', tags: ['intrecciato', 'woven'] },
  { name: 'Triomphe Bag in Shiny Calfskin', brand: 'Celine', category: 'Bags', description: 'Signature Triomphe closure on smooth calfskin leather.', originalPrice: 2900, ourPrice: 2100, discount: 28, images: ['https://picsum.photos/seed/celine-bag-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/celine-triomphe', sku: 'CELINE-BAG-001', tags: ['calfskin', 'classic'] },
  { name: 'Classic Flap Bag Medium', brand: 'Chanel', category: 'Bags', description: 'The iconic Chanel flap bag in quilted lambskin with CC turn-lock.', originalPrice: 8200, ourPrice: 5999, discount: 27, images: ['https://picsum.photos/seed/chanel-bag-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/chanel-flap', sku: 'CHANEL-BAG-001', featured: true, collectionSlug: 'editors-picks', tags: ['iconic', 'lambskin'] },
  { name: 'Speedy 30 Bandouliere', brand: 'Louis Vuitton', category: 'Bags', description: 'The iconic Speedy bag in Monogram canvas with removable strap.', originalPrice: 1590, ourPrice: 1150, discount: 28, images: ['https://picsum.photos/seed/lv-bag-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/lv-speedy', sku: 'LV-BAG-001', tags: ['monogram', 'canvas'] },
  { name: 'La Medusa Medium Handbag', brand: 'Versace', category: 'Bags', description: 'Smooth leather handbag with iconic Medusa head closure.', originalPrice: 2295, ourPrice: 1599, discount: 30, images: ['https://picsum.photos/seed/versace-bag-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/versace-medusa', sku: 'VERSACE-BAG-001', collectionSlug: 'trending', tags: ['medusa', 'statement'] },
  { name: 'Binder Clip Bag', brand: 'Off-White', category: 'Bags', description: 'Signature industrial binder clip closure on smooth leather.', originalPrice: 1390, ourPrice: 899, discount: 35, images: ['https://picsum.photos/seed/ow-bag-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/ow-binder', sku: 'OW-BAG-001', isOnSale: true, collectionSlug: 'sale', tags: ['streetwear', 'industrial'] },
  { name: 'TB Bag in Leather', brand: 'Burberry', category: 'Bags', description: 'Thomas Burberry monogram crossbody in grain leather.', originalPrice: 1790, ourPrice: 1199, discount: 33, images: ['https://picsum.photos/seed/burberry-bag-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/burberry-tb', sku: 'BURBERRY-BAG-001', collectionSlug: 'trending', tags: ['crossbody', 'monogram'] },
  { name: 'Puzzle Bag Small', brand: 'Loewe', category: 'Bags', description: 'Iconic puzzle construction in classic calfskin.', originalPrice: 3350, ourPrice: 2499, discount: 25, images: ['https://picsum.photos/seed/loewe-bag-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/loewe-puzzle', sku: 'LOEWE-BAG-001', featured: true, collectionSlug: 'editors-picks', tags: ['puzzle', 'sculptural'] },
  { name: 'Bobby Bag in Smooth Leather', brand: 'Dior', category: 'Bags', description: 'Elegant hobo bag with magnetic D clasp.', originalPrice: 3800, ourPrice: 2799, discount: 26, images: ['https://picsum.photos/seed/dior-bag-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/dior-bobby', sku: 'DIOR-BAG-001', tags: ['hobo', 'elegant'] },
  { name: 'Antigona Mini', brand: 'Givenchy', category: 'Bags', description: 'Structured mini bag in box leather with signature triangle detail.', originalPrice: 1690, ourPrice: 1149, discount: 32, images: ['https://picsum.photos/seed/givenchy-bag-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/givenchy-antigona', sku: 'GIVENCHY-BAG-001', isOnSale: true, collectionSlug: 'sale', tags: ['structured', 'mini'] },
  { name: 'Devotion Bag in Quilted Nappa', brand: 'Dolce & Gabbana', category: 'Bags', description: 'Sacred heart closure on quilted nappa leather.', originalPrice: 2495, ourPrice: 1699, discount: 32, images: ['https://picsum.photos/seed/dg-bag-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/dg-devotion', sku: 'DG-BAG-001', tags: ['quilted', 'heart'] },

  // ===== SHOES (12) =====
  { name: 'Horsebit Suede Ankle Boots', brand: 'Gucci', category: 'Shoes', description: 'Iconic horsebit suede ankle boots with block heel.', originalPrice: 1200, ourPrice: 799, discount: 33, images: ['https://picsum.photos/seed/gucci-shoe-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/gucci-boots', sku: 'GUCCI-SHOE-001', isOnSale: true, collectionSlug: 'sale', tags: ['boots', 'suede'] },
  { name: 'Monolith Patent Leather Loafers', brand: 'Prada', category: 'Shoes', description: 'Iconic chunky sole loafers in patent leather.', originalPrice: 1450, ourPrice: 995, discount: 31, images: ['https://picsum.photos/seed/prada-shoe-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/prada-loafers', sku: 'PRADA-SHOE-001', collectionSlug: 'trending', tags: ['loafers', 'platform'] },
  { name: 'Wyatt Harness Boots', brand: 'Saint Laurent', category: 'Shoes', description: 'Classic Western-inspired harness boots in leather.', originalPrice: 1495, ourPrice: 1049, discount: 30, images: ['https://picsum.photos/seed/ysl-shoe-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/ysl-wyatt', sku: 'YSL-SHOE-001', tags: ['boots', 'western'] },
  { name: 'Track Sneakers', brand: 'Balenciaga', category: 'Shoes', description: 'Chunky track sneakers in mixed materials.', originalPrice: 895, ourPrice: 649, discount: 27, images: ['https://picsum.photos/seed/balenciaga-shoe-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/balenciaga-track', sku: 'BALENCIAGA-SHOE-001', tags: ['sneakers', 'chunky'] },
  { name: 'Puddle Boots', brand: 'Bottega Veneta', category: 'Shoes', description: 'Rubber puddle boots with rounded toe.', originalPrice: 750, ourPrice: 499, discount: 33, images: ['https://picsum.photos/seed/bv-shoe-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/bv-puddle', sku: 'BV-SHOE-001', isOnSale: true, collectionSlug: 'sale', tags: ['boots', 'rubber'] },
  { name: 'B23 High-Top Sneakers', brand: 'Dior', category: 'Shoes', description: 'B23 high-top sneakers in Oblique canvas.', originalPrice: 1100, ourPrice: 799, discount: 27, images: ['https://picsum.photos/seed/dior-shoe-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/dior-sneakers', sku: 'DIOR-SHOE-001', tags: ['sneakers', 'high-top'] },
  { name: 'Chain Reaction Sneakers', brand: 'Versace', category: 'Shoes', description: 'Chain-link sole sneakers with Greca print.', originalPrice: 1075, ourPrice: 699, discount: 35, images: ['https://picsum.photos/seed/versace-shoe-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/versace-chain', sku: 'VERSACE-SHOE-001', isOnSale: true, collectionSlug: 'sale', tags: ['sneakers', 'chain'] },
  { name: 'Out Of Office Sneakers', brand: 'Off-White', category: 'Shoes', description: 'Signature arrows and "For Walking" text on leather sneakers.', originalPrice: 695, ourPrice: 449, discount: 35, images: ['https://picsum.photos/seed/ow-shoe-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/ow-ooo', sku: 'OW-SHOE-001', isOnSale: true, collectionSlug: 'sale', tags: ['sneakers', 'streetwear'] },
  { name: 'Arthur Sneakers', brand: 'Burberry', category: 'Shoes', description: 'Vintage check nylon and suede sneakers.', originalPrice: 790, ourPrice: 529, discount: 33, images: ['https://picsum.photos/seed/burberry-shoe-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/burberry-arthur', sku: 'BURBERRY-SHOE-001', tags: ['sneakers', 'check'] },
  { name: 'Penny Loafers with Web', brand: 'Gucci', category: 'Shoes', description: 'Classic penny loafers with signature Web detail.', originalPrice: 890, ourPrice: 599, discount: 33, images: ['https://picsum.photos/seed/gucci-shoe-2/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/gucci-loafers', sku: 'GUCCI-SHOE-002', tags: ['loafers', 'classic'] },
  { name: 'Garavani Rockstud Pumps', brand: 'Valentino', category: 'Shoes', description: 'Iconic rockstud ankle strap pumps in patent leather.', originalPrice: 1090, ourPrice: 749, discount: 31, images: ['https://picsum.photos/seed/valentino-shoe-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/valentino-rockstud', sku: 'VALENTINO-SHOE-001', collectionSlug: 'editors-picks', tags: ['pumps', 'rockstud'] },
  { name: 'Flow Runner Sneakers', brand: 'Loewe', category: 'Shoes', description: 'Retro-inspired runner in nylon and suede.', originalPrice: 690, ourPrice: 469, discount: 32, images: ['https://picsum.photos/seed/loewe-shoe-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/loewe-flow', sku: 'LOEWE-SHOE-001', tags: ['sneakers', 'retro'] },

  // ===== CLOTHING (14) =====
  { name: 'Silk Crepe Blouse', brand: 'Gucci', category: 'Clothing', description: 'Flowing silk blouse with signature GG buttons.', originalPrice: 1500, ourPrice: 999, discount: 33, images: ['https://picsum.photos/seed/gucci-cloth-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/gucci-blouse', sku: 'GUCCI-CLOTH-001', tags: ['silk', 'blouse'] },
  { name: 'Re-Nylon Puffer Jacket', brand: 'Prada', category: 'Clothing', description: 'Iconic nylon puffer with down fill and triangle logo.', originalPrice: 2490, ourPrice: 1749, discount: 30, images: ['https://picsum.photos/seed/prada-cloth-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/prada-puffer', sku: 'PRADA-CLOTH-001', featured: true, collectionSlug: 'editors-picks', tags: ['puffer', 'nylon'] },
  { name: 'Oversized Wool Blazer', brand: 'Saint Laurent', category: 'Clothing', description: 'Double-breasted wool blazer with satin lapels.', originalPrice: 3290, ourPrice: 2299, discount: 30, images: ['https://picsum.photos/seed/ysl-cloth-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/ysl-blazer', sku: 'YSL-CLOTH-001', tags: ['blazer', 'tailoring'] },
  { name: 'Double Breasted Coat', brand: 'Balenciaga', category: 'Clothing', description: 'Oversized double breasted wool coat.', originalPrice: 4590, ourPrice: 3199, discount: 30, images: ['https://picsum.photos/seed/balenciaga-cloth-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/balenciaga-coat', sku: 'BALENCIAGA-CLOTH-001', tags: ['coat', 'oversized'] },
  { name: 'Cashmere Turtleneck', brand: 'Loro Piana', category: 'Clothing', description: 'Pure cashmere turtleneck sweater.', originalPrice: 1890, ourPrice: 1299, discount: 31, images: ['https://picsum.photos/seed/lp-cloth-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/lp-turtleneck', sku: 'LP-CLOTH-001', tags: ['cashmere', 'knitwear'] },
  { name: 'Silk Midi Dress', brand: 'Celine', category: 'Clothing', description: 'Elegant silk dress with bow detail at neckline.', originalPrice: 3690, ourPrice: 2599, discount: 30, images: ['https://picsum.photos/seed/celine-cloth-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/celine-dress', sku: 'CELINE-CLOTH-001', tags: ['dress', 'silk'] },
  { name: 'Baroque Print Silk Shirt', brand: 'Versace', category: 'Clothing', description: 'Signature baroque print on luxurious silk twill.', originalPrice: 1275, ourPrice: 849, discount: 33, images: ['https://picsum.photos/seed/versace-cloth-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/versace-shirt', sku: 'VERSACE-CLOTH-001', collectionSlug: 'trending', tags: ['silk', 'print', 'statement'] },
  { name: 'Arrows Hoodie', brand: 'Off-White', category: 'Clothing', description: 'Oversized cotton hoodie with diagonal arrows print.', originalPrice: 695, ourPrice: 449, discount: 35, images: ['https://picsum.photos/seed/ow-cloth-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/ow-hoodie', sku: 'OW-CLOTH-001', isOnSale: true, collectionSlug: 'sale', tags: ['hoodie', 'streetwear'] },
  { name: 'Vintage Check Trench Coat', brand: 'Burberry', category: 'Clothing', description: 'Heritage trench coat with iconic check lining.', originalPrice: 2390, ourPrice: 1699, discount: 29, images: ['https://picsum.photos/seed/burberry-cloth-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/burberry-trench', sku: 'BURBERRY-CLOTH-001', featured: true, collectionSlug: 'editors-picks', tags: ['trench', 'heritage'] },
  { name: 'Wool Tailored Trousers', brand: 'Bottega Veneta', category: 'Clothing', description: 'Wide-leg wool trousers with pressed creases.', originalPrice: 1350, ourPrice: 899, discount: 33, images: ['https://picsum.photos/seed/bv-cloth-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/bv-trousers', sku: 'BV-CLOTH-001', tags: ['trousers', 'tailoring'] },
  { name: 'Anagram Embroidered T-Shirt', brand: 'Loewe', category: 'Clothing', description: 'Relaxed fit cotton tee with anagram embroidery.', originalPrice: 490, ourPrice: 339, discount: 31, images: ['https://picsum.photos/seed/loewe-cloth-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/loewe-tee', sku: 'LOEWE-CLOTH-001', tags: ['t-shirt', 'casual'] },
  { name: 'Leather Moto Jacket', brand: 'Saint Laurent', category: 'Clothing', description: 'Classic leather biker jacket with silver hardware.', originalPrice: 5490, ourPrice: 3899, discount: 29, images: ['https://picsum.photos/seed/ysl-cloth-2/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/ysl-moto', sku: 'YSL-CLOTH-002', featured: true, collectionSlug: 'editors-picks', tags: ['leather', 'moto', 'iconic'] },
  { name: 'Logo Denim Jacket', brand: 'Balenciaga', category: 'Clothing', description: 'Oversized denim jacket with embroidered logo.', originalPrice: 1450, ourPrice: 949, discount: 35, images: ['https://picsum.photos/seed/balenciaga-cloth-2/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/balenciaga-denim', sku: 'BALENCIAGA-CLOTH-002', isOnSale: true, collectionSlug: 'sale', tags: ['denim', 'oversized'] },
  { name: 'Wool Crepe Midi Skirt', brand: 'Prada', category: 'Clothing', description: 'A-line midi skirt in virgin wool crepe with logo waistband.', originalPrice: 1250, ourPrice: 849, discount: 32, images: ['https://picsum.photos/seed/prada-cloth-2/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/prada-skirt', sku: 'PRADA-CLOTH-002', tags: ['skirt', 'wool'] },

  // ===== ACCESSORIES (12) =====
  { name: 'GG Supreme Belt', brand: 'Gucci', category: 'Accessories', description: 'Double G buckle belt in GG Supreme canvas.', originalPrice: 450, ourPrice: 299, discount: 33, images: ['https://picsum.photos/seed/gucci-acc-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/gucci-belt', sku: 'GUCCI-ACC-001', tags: ['belt', 'canvas'] },
  { name: 'Saffiano Card Holder', brand: 'Prada', category: 'Accessories', description: 'Compact card holder in signature Saffiano leather.', originalPrice: 340, ourPrice: 229, discount: 33, images: ['https://picsum.photos/seed/prada-acc-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/prada-cardholder', sku: 'PRADA-ACC-001', tags: ['card holder', 'saffiano'] },
  { name: 'Monogram Belt', brand: 'Louis Vuitton', category: 'Accessories', description: 'Signature monogram canvas belt with LV buckle.', originalPrice: 490, ourPrice: 349, discount: 29, images: ['https://picsum.photos/seed/lv-acc-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/lv-belt', sku: 'LV-ACC-001', tags: ['belt', 'monogram'] },
  { name: 'Giant Check Cashmere Scarf', brand: 'Burberry', category: 'Accessories', description: 'Luxurious cashmere scarf with vintage check pattern.', originalPrice: 490, ourPrice: 329, discount: 33, images: ['https://picsum.photos/seed/burberry-acc-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/burberry-scarf', sku: 'BURBERRY-ACC-001', collectionSlug: 'trending', tags: ['scarf', 'cashmere', 'check'] },
  { name: 'Cat-Eye Sunglasses', brand: 'Celine', category: 'Accessories', description: 'Oversized cat-eye sunglasses in acetate.', originalPrice: 395, ourPrice: 269, discount: 32, images: ['https://picsum.photos/seed/celine-acc-1/800/1000'], retailerSource: 'Nordstrom', retailerUrl: 'https://nordstrom.com/celine-sunglasses', sku: 'CELINE-ACC-001', tags: ['sunglasses', 'cat-eye'] },
  { name: 'Classic Wallet on Chain', brand: 'Chanel', category: 'Accessories', description: 'Classic quilted lambskin wallet with chain strap.', originalPrice: 3850, ourPrice: 2699, discount: 30, images: ['https://picsum.photos/seed/chanel-acc-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/chanel-woc', sku: 'CHANEL-ACC-001', featured: true, tags: ['wallet', 'chain', 'quilted'] },
  { name: 'Intrecciato Card Case', brand: 'Bottega Veneta', category: 'Accessories', description: 'Card holder in signature intrecciato leather.', originalPrice: 390, ourPrice: 269, discount: 31, images: ['https://picsum.photos/seed/bv-acc-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/bv-slg', sku: 'BV-ACC-001', tags: ['card case', 'intrecciato'] },
  { name: 'Medusa Head Belt', brand: 'Versace', category: 'Accessories', description: 'Smooth leather belt with gold Medusa buckle.', originalPrice: 495, ourPrice: 329, discount: 34, images: ['https://picsum.photos/seed/versace-acc-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/versace-belt', sku: 'VERSACE-ACC-001', tags: ['belt', 'medusa', 'gold'] },
  { name: 'Industrial Belt', brand: 'Off-White', category: 'Accessories', description: 'Signature yellow industrial belt with logo jacquard.', originalPrice: 225, ourPrice: 149, discount: 34, images: ['https://picsum.photos/seed/ow-acc-1/800/1000'], retailerSource: 'Farfetch', retailerUrl: 'https://farfetch.com/ow-belt', sku: 'OW-ACC-001', isOnSale: true, collectionSlug: 'sale', tags: ['belt', 'industrial', 'yellow'] },
  { name: 'Garavani Rockstud Wallet', brand: 'Valentino', category: 'Accessories', description: 'Continental wallet with platinum-finish rockstud detail.', originalPrice: 695, ourPrice: 479, discount: 31, images: ['https://picsum.photos/seed/valentino-acc-1/800/1000'], retailerSource: 'Saks', retailerUrl: 'https://saks.com/valentino-wallet', sku: 'VALENTINO-ACC-001', tags: ['wallet', 'rockstud'] },
  { name: 'Cashmere Beanie', brand: 'Loro Piana', category: 'Accessories', description: 'Pure cashmere beanie with ribbed finish.', originalPrice: 395, ourPrice: 269, discount: 32, images: ['https://picsum.photos/seed/lp-acc-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/lp-beanie', sku: 'LP-ACC-001', tags: ['beanie', 'cashmere'] },
  { name: 'Silk Tie', brand: 'Brunello Cucinelli', category: 'Accessories', description: 'Hand-rolled silk tie in classic pattern.', originalPrice: 395, ourPrice: 279, discount: 29, images: ['https://picsum.photos/seed/bc-acc-1/800/1000'], retailerSource: 'Neiman Marcus', retailerUrl: 'https://neimanmarcus.com/bc-tie', sku: 'BC-ACC-001', tags: ['tie', 'silk'] },
];

const seedRetailers = [
  { name: 'Saks', baseUrl: 'https://www.saksfifthavenue.com', scraperModule: 'saks', hasAffiliate: true, affiliateNetwork: 'Rakuten', markup: 5 },
  { name: 'Nordstrom', baseUrl: 'https://shop.nordstrom.com', scraperModule: 'nordstrom', hasAffiliate: true, affiliateNetwork: 'Rakuten', markup: 5 },
  { name: 'Neiman Marcus', baseUrl: 'https://www.neimanmarcus.com', scraperModule: 'neiman', hasAffiliate: true, affiliateNetwork: 'Rakuten', markup: 5 },
  { name: 'Farfetch', baseUrl: 'https://www.farfetch.com', scraperModule: 'farfetch', hasAffiliate: true, affiliateNetwork: 'Awin', markup: 7 },
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dirty-apple';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await Product.deleteMany({});
    await Retailer.deleteMany({});
    await PriceHistory.deleteMany({});
    console.log('Cleared existing data');

    const sizeType = (cat: string) => {
      switch (cat) {
        case 'Bags': return 'bag';
        case 'Shoes': return 'shoes';
        case 'Clothing': return 'clothing';
        case 'Accessories': return 'accessories';
        default: return 'accessories';
      }
    };

    const productsWithSlugs = products.map(p => ({
      ...p,
      slug: slugify(p.brand, p.name),
      sizes: sizes(sizeType(p.category) as any),
      featured: p.featured || false,
      isOnSale: p.isOnSale || false,
      isClearance: false,
      status: 'active' as const,
      collectionSlug: (p as any).collectionSlug || undefined,
      tags: p.tags || [],
    }));

    const inserted = await Product.insertMany(productsWithSlugs);
    console.log(`Inserted ${inserted.length} products`);

    // Create initial price history entries
    const priceHistories = inserted.map(p => ({
      product: p._id,
      sourcePrice: p.originalPrice,
      ourPrice: p.ourPrice,
      retailer: p.retailerSource,
      recordedAt: new Date(),
      priceChange: 0,
      isFlashDeal: false,
    }));
    await PriceHistory.insertMany(priceHistories);
    console.log(`Inserted ${priceHistories.length} price history entries`);

    await Retailer.insertMany(seedRetailers);
    console.log(`Inserted ${seedRetailers.length} retailers`);

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
