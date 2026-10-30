'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/shop', label: 'Shop' },
  { href: '/shop?gender=women', label: 'Women' },
  { href: '/shop?gender=men', label: 'Men' },
  { href: '/collections/sale', label: 'Sale' },
];
const mobileLinks = [
  { href: '/shop', label: 'Shop All' },
  { href: '/shop?category=bags', label: 'Bags' },
  { href: '/shop?category=shoes', label: 'Shoes' },
  { href: '/shop?category=clothing', label: 'Clothing' },
  { href: '/shop?category=accessories', label: 'Accessories' },
  { href: '/collections/sale', label: 'Sale' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) {
      if (dialog.current?.open) dialog.current.close();
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="atelier-header">
        <nav className="atelier-nav" aria-label="Main navigation">
          <Link href="/" className="atelier-brand" aria-label="Dirty Apple home">
            <img src="/dirty-apple-logo.png" alt="Dirty Apple" width="42" height="42" />
            <span>DIRTY APPLE<small>A DIFFERENT PERSPECTIVE</small></span>
          </Link>
          <div className="desktop-navigation">{links.map(link => <Link key={link.href} href={link.href} className={link.href === pathname ? 'nav-current' : ''}>{link.label}</Link>)}</div>
          <div className="nav-actions">
            <Link href="/shop" className="nav-icon" aria-label="Search products"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.4" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.4" /></svg></Link>
            <Link href="/cart" className="nav-icon" aria-label="Shopping cart"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></Link>
            <button ref={trigger} className="menu-trigger nav-icon" aria-label="Menu" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.4" /></svg></button>
          </div>
        </nav>
      </header>
      <dialog ref={dialog} id="mobile-menu" className="atelier-menu" aria-labelledby="menu-title" onCancel={event => { event.preventDefault(); closeMenu(); }} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="menu-panel"><div className="menu-heading"><p id="menu-title" className="eyebrow">A world to discover</p><button className="nav-icon" onClick={closeMenu} aria-label="Close menu">✕</button></div>
          <nav aria-label="Mobile navigation">{mobileLinks.map((link, i) => <Link key={link.href} href={link.href} onClick={closeMenu}><small>0{i + 1}</small>{link.label}<span aria-hidden="true">↗</span></Link>)}</nav>
          <p className="menu-note">Your style. Your point of view.</p>
        </div>
      </dialog>
    </>
  );
}
