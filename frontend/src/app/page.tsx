'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { Product, ProductPage } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';

const categories = [
  { name: 'Bags', slug: 'bags', image: '/cat-bags.jpg', note: 'Objects of affection' },
  { name: 'Shoes', slug: 'shoes', image: '/cat-shoes.jpg', note: 'A different direction' },
  { name: 'Clothing', slug: 'clothing', image: '/cat-clothing.jpg', note: 'Room for expression' },
  { name: 'Accessories', slug: 'accessories', image: '/cat-accessories.jpg', note: 'The finishing thought' },
];
const brands = ['Saint Laurent', 'Gucci', 'Prada', 'Loewe', 'Bottega Veneta', 'Dior', 'Valentino', 'Balenciaga'];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h16m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [motion, setMotion] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotion(!preference.matches);
    const change = () => setMotion(!preference.matches);
    preference.addEventListener('change', change);
    return () => {
      preference.removeEventListener('change', change);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<ProductPage>('/products?featured=true&inStock=true&limit=4&sort=price-low', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setFeatured(data.products); })
      .catch(() => { if (!controller.signal.aborted) setCatalogError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function resetTilt() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    stage.current?.style.setProperty('--tilt-x', '0deg');
    stage.current?.style.setProperty('--tilt-y', '0deg');
  }

  return (
    <div className="dimension-home" data-motion={motion ? 'on' : 'off'}>
      <section className="dimension-hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow"><span className="signal-dot" /> A new perspective on fashion</p>
          <h1 id="hero-heading">Style in<br /><em>another</em><br />dimension.</h1>
          <p className="hero-description">The spirit of Paris. The instinct of Milan.<br className="desktop-break" /> A world of possibilities, made your own.</p>
          <div className="hero-actions">
            <Link href="/shop" className="atelier-button atelier-button-dark">Explore the edit <Arrow /></Link>
            <Link href="/collections/sale" className="atelier-text-link">Discover the sale <Arrow diagonal /></Link>
          </div>
          <div className="hero-footnote"><span>Curated luxury. Uncovered prices.</span><span className="fine-rule" /></div>
        </div>

        <div className="hero-stage" ref={stage}
          onPointerMove={event => {
            if (!motion || event.pointerType !== 'mouse') return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 7;
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -7;
            if (frame.current !== null) cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(() => {
              stage.current?.style.setProperty('--tilt-x', y + 'deg');
              stage.current?.style.setProperty('--tilt-y', x + 'deg');
            });
          }}
          onPointerLeave={resetTilt}>
          <div className="stage-halo" aria-hidden="true" />
          <div className="chrome-orbit orbit-one" aria-hidden="true" />
          <div className="chrome-orbit orbit-two" aria-hidden="true" />
          <div className="campaign-frame">
            <img src="/hero-bg.jpg" alt="Dirty Apple fashion campaign featuring three models in statement eyewear and tailored looks" fetchPriority="high" />
            <div className="campaign-caption"><span>DIRTY APPLE — THE NEW PERSPECTIVE</span><span>CAMPAIGN 01</span></div>
          </div>
          <div className="floating-caption"><span className="caption-spark" aria-hidden="true">✳</span><div><span>Fashion is a feeling.</span><small>Find yours.</small></div></div>
          <div className="stage-index" aria-hidden="true">FORM / FEELING / FUTURE</div>
          <button className="motion-control" aria-pressed={motion} onClick={() => { setMotion(!motion); resetTilt(); }} aria-label={motion ? 'Pause ambient motion' : 'Enable ambient motion'}>
            <span aria-hidden="true">{motion ? 'Ⅱ' : '▷'}</span> Motion {motion ? 'on' : 'off'}
          </button>
        </div>
      </section>

      <div className="perspective-strip"><p>Inspired by the cities.<br /><strong>Defined by you.</strong></p><span>PARIS</span><i aria-hidden="true">✳</i><span>MILANO</span><i aria-hidden="true">✳</i><span>EVERYWHERE</span><span className="strip-coordinate" aria-hidden="true">A DIFFERENT POINT OF VIEW ↗</span></div>

      <section className="atelier-section" id="the-edit" aria-labelledby="edit-heading">
        <div className="section-heading">
          <div><p className="eyebrow">01 — The collection</p><h2 id="edit-heading">Follow your <em>curiosity.</em></h2></div>
          <p>Considered pieces. Unexpected combinations.<br />Start with whatever speaks to you.</p>
        </div>
        <div className="category-gallery">
          {categories.map((category, index) => (
            <Link href={'/shop?category=' + category.slug} key={category.slug} className="category-object">
              <div className="category-photo"><img src={category.image} alt={category.name} loading="lazy" /><span className="object-number" aria-hidden="true">0{index + 1}</span><span className="object-arrow"><Arrow diagonal /></span></div>
              <div className="category-caption"><h3>{category.name}</h3><p>{category.note}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="editorial-section" aria-labelledby="editorial-heading">
        <div className="editorial-intro"><p className="eyebrow">02 — Ways of seeing</p><h2 id="editorial-heading">An eye for the unexpected.<br /><em>A style that’s entirely yours.</em></h2><p>From a café in Saint-Germain to a late afternoon in Milan.<br />Take the inspiration. Make it personal.</p></div>
        <div className="editorial-gallery">
          <Link href="/shop?gender=women" className="editorial-object editorial-women">
            <div className="editorial-photo"><img src="/editorial-collage.jpg" alt="An expressive collage of fashion looks from the women's edit" loading="lazy" /><span className="editorial-stamp">A STUDY IN<br /><em>individuality.</em></span></div>
            <div className="editorial-caption"><div><p className="eyebrow">The women’s edit</p><h3>Every side of you.</h3></div><span className="editorial-link">Explore women <Arrow diagonal /></span></div>
          </Link>
          <Link href="/shop?gender=men" className="editorial-object editorial-men">
            <div className="editorial-photo"><img src="/editorial-mens.jpg" alt="Contemporary menswear with relaxed silhouettes and statement eyewear" loading="lazy" /></div>
            <div className="editorial-caption"><div><p className="eyebrow">The men’s edit</p><h3>A new kind of ease.</h3></div><span className="editorial-link">Explore men <Arrow diagonal /></span></div>
            <p className="editorial-note">Good style leaves room for possibility.</p>
          </Link>
        </div>
      </section>

      <section className="atelier-section featured-section" aria-labelledby="featured-heading">
        <div className="section-heading"><div><p className="eyebrow">03 — Discover something</p><h2 id="featured-heading">Your next <em>favourite.</em></h2></div><Link href="/shop?featured=true" className="atelier-text-link">View the selection <Arrow diagonal /></Link></div>
        {loading ? <div className="featured-grid" aria-label="Loading featured listings" role="status">{[0, 1, 2, 3].map(i => <div className="featured-skeleton skeleton" key={i} />)}</div>
          : catalogError ? <div className="catalog-notice" role="status"><p>Current listings are temporarily unavailable.</p><Link href="/shop" className="atelier-text-link">Try the shop again <Arrow /></Link></div>
          : featured.length > 0 ? <div className="featured-grid">{featured.map(product => <ProductCard key={product._id} product={product} />)}</div>
          : <div className="catalog-notice"><p>There are no featured listings right now. Explore the full collection for your next discovery.</p><Link href="/shop" className="atelier-text-link">Explore all listings <Arrow /></Link></div>}
      </section>

      <section className="designer-section" aria-labelledby="designer-heading">
        <p id="designer-heading" className="eyebrow">Explore the names that inspire you</p>
        <div className="designer-names">{brands.map(brand => <Link key={brand} href={'/shop?brand=' + encodeURIComponent(brand)}>{brand}</Link>)}</div>
      </section>

      <section className="invitation-section" aria-labelledby="invitation-heading">
        <div className="invitation-orbit" aria-hidden="true" />
        <p className="eyebrow">An open invitation</p>
        <h2 id="invitation-heading">The future of style<br />looks like <em>you.</em></h2>
        <p>No dress code. Just your point of view.</p>
        <Link href="/shop" className="atelier-button atelier-button-light">Find your next favourite <Arrow /></Link>
      </section>
    </div>
  );
}
