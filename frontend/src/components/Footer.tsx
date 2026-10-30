import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="atelier-footer">
      <div className="footer-top">
        <div className="footer-intro"><p className="eyebrow">Curated luxury. Uncovered prices.</p><h2>A world of fashion.<br /><em>A point of view of your own.</em></h2><p>Discover designer pieces, explore new perspectives,<br />and find something that feels like you.</p></div>
        <div className="footer-column"><h3>Explore</h3><Link href="/shop?category=bags">Bags</Link><Link href="/shop?category=shoes">Shoes</Link><Link href="/shop?category=clothing">Clothing</Link><Link href="/shop?category=accessories">Accessories</Link><Link href="/collections/sale">Sale</Link></div>
        <div className="footer-column"><h3>Dirty Apple</h3><Link href="/about">Our story</Link><Link href="/about#contact">Get in touch</Link><Link href="/about#shipping">Shipping & returns</Link><Link href="/shop">Discover the collection ↗</Link></div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">DIRTY APPLE<span>✳</span></div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} Dirty Apple</p><p>Fashion is for everyone.</p><Link href="#main-content">Back to top ↑</Link></div>
    </footer>
  );
}
