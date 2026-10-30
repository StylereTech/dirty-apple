import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useSearch } from 'wouter';
import { ArrowUpRight, ChevronDown, Menu, Search, SlidersHorizontal, X } from 'lucide-react';

const categories = [
  { name: 'Bags', slug: 'bags', image: '/cat-bags.jpg' },
  { name: 'Shoes', slug: 'shoes', image: '/cat-shoes.jpg' },
  { name: 'Clothing', slug: 'clothing', image: '/cat-clothing.jpg' },
  { name: 'Accessories', slug: 'accessories', image: '/cat-accessories.jpg' },
];
const brands = [
  'Saint Laurent', 'Gucci', 'Prada', 'Valentino', 'Burberry', 'Amiri',
  'Off-White', 'Balenciaga', 'Dior', 'Givenchy', 'Versace', 'Fendi',
  'Bottega Veneta', 'Loewe', 'Moncler', 'Tom Ford',
];
const tickerItems = [
  'SAINT LAURENT', 'GUCCI', 'PRADA', 'VALENTINO', 'BURBERRY', 'AMIRI',
  'OFF-WHITE', 'BALENCIAGA', 'DIOR', 'CURATED LUXURY', 'UNCOVERED PRICES', 'EXPLORE THE EDIT',
];
const navItems = [
  { href: '/shop', label: 'Shop All' },
  { href: '/shop?category=bags', label: 'Bags' },
  { href: '/shop?category=shoes', label: 'Shoes' },
  { href: '/shop?category=clothing', label: 'Clothing' },
  { href: '/shop?category=accessories', label: 'Accessories' },
  { href: '/collections/sale', label: 'Sale' },
];
const mobileItems = [
  { href: '/shop', label: 'Shop All' },
  { href: '/shop?category=bags', label: 'Bags' },
  { href: '/shop?category=shoes', label: 'Shoes' },
  { href: '/shop?category=clothing', label: 'Clothing' },
  { href: '/shop?category=accessories', label: 'Accessories' },
  { href: '/collections/sale', label: 'Sale' },
];

function Navbar() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const query = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocusRequested, setSearchFocusRequested] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const menuWasOpen = useRef(false);
  const isHome = location === '/';
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => setMenuOpen(false), [location]);
  useEffect(() => {
    if (menuOpen) {
      menuRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
    } else if (menuWasOpen.current) {
      menuToggleRef.current?.focus();
    }
    menuWasOpen.current = menuOpen;
  }, [menuOpen]);
  useEffect(() => {
    if (searchFocusRequested && location === '/shop') {
      document.getElementById('product-search')?.focus();
      setSearchFocusRequested(false);
    }
  }, [location, searchFocusRequested]);
  useEffect(() => {
    if (!menuOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === 'Tab') {
        const links = menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]');
        const first = links?.[0];
        const last = links?.[links.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  const transparent = isHome && !scrolled && !menuOpen;
  return (
    <>
      <nav className="site-nav" data-transparent={transparent} aria-label="Main navigation">
        <div className="nav-inner">
          <button ref={menuToggleRef} className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu" data-testid="button-mobile-menu">
            {menuOpen ? <X size={20} strokeWidth={1.4} /> : <Menu size={20} strokeWidth={1.4} />}
          </button>
          <div className="nav-left">
            {navItems.map((item) => {
              const active = item.label === 'Shop All'
                ? location === item.href && !query.has('category')
                : item.href.includes('?category=')
                  ? location === '/shop' && query.get('category') === item.href.split('=')[1]
                  : location === item.href;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`nav-link ${active ? 'is-active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <Link href="/" className="brand-mark" aria-label="Dirty Apple home" data-testid="link-home-logo">
            <img src="/dirty-apple-logo.png" alt="Dirty Apple" />
          </Link>
          <div className="nav-tools">
            <button type="button" onClick={() => { setSearchFocusRequested(true); setLocation('/shop'); }} aria-label="Search products" className="nav-icon" data-testid="button-search">
              <Search size={18} strokeWidth={1.4} />
            </button>
            <Link href="/cart" aria-label="Shopping bag" className="nav-icon" data-testid="link-shopping-bag">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8.5h14l1 12H4l1-12Z" stroke="currentColor" strokeWidth="1.35" /><path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.35" /></svg>
            </Link>
          </div>
        </div>
      </nav>
      <div id="mobile-menu" ref={menuRef} className={`mobile-menu ${menuOpen ? 'menu-open' : ''}`} role="dialog" aria-modal="true" aria-label="Main menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="mobile-menu-content">
          {mobileItems.map((item, i) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="mobile-menu-link" style={{ transitionDelay: menuOpen ? `${i * 45}ms` : '0ms' }} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function Footer() {
  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <p className="footer-wordmark">Dirty Apple</p>
        <nav aria-label="Footer navigation" className="footer-links">
          {[
            { label: 'Shop', href: '/shop' },
            { label: 'Bags', href: '/shop?category=bags' },
            { label: 'Shoes', href: '/shop?category=shoes' },
            { label: 'Clothing', href: '/shop?category=clothing' },
            { label: 'Accessories', href: '/shop?category=accessories' },
            { label: 'Sale', href: '/collections/sale' },
          ].map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
        </nav>
        <p className="copyright">© {new Date().getFullYear()} Dirty Apple</p>
      </div>
    </footer>
  );
}

function Cart() {
  useEffect(() => { document.title = 'Your Cart is Empty | Dirty Apple'; }, []);
  return (
    <main className="cart-page">
      <div className="cart-empty-art" aria-hidden="true" />
      <section className="cart-empty-card" aria-labelledby="cart-empty-title">
        <div className="cart-empty-mark" aria-hidden="true" />
        <h1 id="cart-empty-title">Your Cart is Empty</h1>
        <p>Discover luxury at uncovered prices</p>
        <Link href="/shop" className="cart-shop-link">SHOP NOW</Link>
      </section>
    </main>
  );
}

function Home() {
  useEffect(() => { document.title = 'Dirty Apple — Monochrome Atelier'; }, []);
  return (
    <main className="home-page">
      <section className="home-hero" aria-label="Dirty Apple">
        <img className="hero-photo" src="/hero-bg.jpg" alt="" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="hero-kicker">Luxury Resale · Redefined</p>
          <h1>DIRTY<br />APPLE</h1>
          <div className="hero-actions">
            <Link href="/shop" className="cta cta-light" data-testid="link-shop-now">Shop Now</Link>
            <Link href="/collections/sale" className="cta cta-outline" data-testid="link-view-deals">View Deals</Link>
          </div>
        </div>
      </section>

      <div className="ticker-band" aria-label="Designer brands and collection highlights">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div className="ticker-set" key={copy} aria-hidden={copy === 1}>
              {tickerItems.map((item) => <span className="ticker-item" key={`${copy}-${item}`}>{item}<i aria-hidden="true" /></span>)}
            </div>
          ))}
        </div>
      </div>

      <section className="category-section">
        <div className="section-wrap">
          <header className="section-heading">
            <p>Explore</p>
            <h2>The Edit</h2>
            <span className="heading-rule" />
          </header>
          <div className="category-grid">
            {categories.map((cat, index) => (
              <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className={`category-tile category-tile-${index + 1}`} data-testid={`link-category-${cat.slug}`}>
                <img src={cat.image} alt={cat.name} loading="lazy" />
                <span className="tile-shade" />
                <span className="tile-copy"><strong>{cat.name}</strong><small>Shop Now <ArrowUpRight size={12} strokeWidth={1.4} /></small></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="editorial-section">
        <div className="editorial-grid">
          <Link href="/shop?gender=women" className="editorial-panel women-panel">
            <img src="/editorial-collage.jpg" alt="Women's Edit" loading="lazy" />
            <span className="editorial-shade" />
            <span className="editorial-caption">
              <small>The Women's Edit</small>
              <strong>Dressed to<br />Dominate</strong>
              <i>Shop Women <ArrowUpRight size={13} strokeWidth={1.4} /></i>
            </span>
          </Link>
          <Link href="/shop?gender=men" className="editorial-panel men-panel">
            <img src="/editorial-mens.jpg" alt="Men's Edit" loading="lazy" />
            <span className="editorial-shade" />
            <span className="editorial-caption">
              <small>The Men's Edit</small>
              <strong>Effortless.<br />Sharp. Real.</strong>
              <i>Shop Men <ArrowUpRight size={13} strokeWidth={1.4} /></i>
            </span>
          </Link>
        </div>
      </section>

      <section className="brand-marquee">
        <p>Explore Designer Style</p>
        <div className="brand-track">
          {[0, 1].map((copy) => (
            <div className="brand-set" key={copy} aria-hidden={copy === 1}>
              {brands.map((brand) => <span key={`${copy}-${brand}`}>{brand}</span>)}
            </div>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-art" />
        <div className="closing-copy">
          <p>Luxury For Less</p>
          <h2>The Drop<br />Doesn't Wait.</h2>
          <Link href="/shop" className="cta cta-light">Shop the Collection</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

type SectionProps = { title: string; expanded: boolean; toggle: () => void; children: ReactNode };
function FilterSection({ title, expanded, toggle, children }: SectionProps) {
  return (
    <section className="filter-section">
      <button type="button" onClick={toggle} aria-expanded={expanded} className="filter-heading" data-testid={`button-filter-${title.toLowerCase().replaceAll(' ', '-')}`}>
        <span>{title}</span><span className="filter-plus">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className="filter-content">{children}</div>}
    </section>
  );
}

function FilterSidebar({ category, setCategory, selectedBrands, toggleBrand, priceRange, setPriceRange, discount, setDiscount, clear }: {
  category: string; setCategory: (value: string) => void; selectedBrands: string[]; toggleBrand: (value: string) => void;
  priceRange: [number, number]; setPriceRange: (value: [number, number]) => void; discount: number; setDiscount: (value: number) => void; clear: () => void;
}) {
  const [expanded, setExpanded] = useState({ category: true, brand: true, price: true, discount: true });
  const setOpen = (key: keyof typeof expanded) => setExpanded((current) => ({ ...current, [key]: !current[key] }));
  const hasFilters = selectedBrands.length > 0 || category !== '' || priceRange[0] > 0 || priceRange[1] < 10000 || discount > 0;
  return (
    <aside className="filter-sidebar" aria-label="Product filters">
      <div className="filter-surface">
        <div className="filter-topline">
          <h2><SlidersHorizontal size={15} strokeWidth={1.5} /> FILTERS</h2>
          {hasFilters && <button type="button" onClick={clear} className="clear-filters" data-testid="button-clear-filters">Clear all</button>}
        </div>
        <FilterSection title="CATEGORY" expanded={expanded.category} toggle={() => setOpen('category')}>
          <div className="category-options">
            {categories.map((item) => <button type="button" key={item.slug} aria-pressed={category === item.slug} onClick={() => setCategory(category === item.slug ? '' : item.slug)} data-testid={`button-filter-category-${item.slug}`}>{item.name}</button>)}
          </div>
        </FilterSection>
        <FilterSection title="BRAND" expanded={expanded.brand} toggle={() => setOpen('brand')}>
          <div className="brand-options">
            {brands.map((brand) => <label key={brand}><input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} /><span>{brand}</span></label>)}
          </div>
        </FilterSection>
        <FilterSection title="PRICE" expanded={expanded.price} toggle={() => setOpen('price')}>
          <div className="price-inputs">
            <input type="number" min="0" max="10000" aria-label="Minimum price" placeholder="Min" value={priceRange[0] || ''} onChange={(e) => {
              const min = Math.min(10000, Math.max(0, Number(e.target.value) || 0));
              setPriceRange([min, Math.max(min, priceRange[1])]);
            }} />
            <span>–</span>
            <input type="number" min={priceRange[0]} max="10000" aria-label="Maximum price" placeholder="Max" value={priceRange[1] === 10000 ? '' : priceRange[1]} onChange={(e) => {
              const max = e.target.value === '' ? 10000 : Math.min(10000, Math.max(priceRange[0], Number(e.target.value) || 0));
              setPriceRange([priceRange[0], max]);
            }} />
          </div>
          <input className="price-range" aria-label="Maximum price slider" type="range" min={priceRange[0]} max="10000" step="100" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} />
        </FilterSection>
        <FilterSection title="MIN DISCOUNT" expanded={expanded.discount} toggle={() => setOpen('discount')}>
          <div className="discount-options">
            {[0, 10, 20, 30].map((amount) => <button type="button" key={amount} aria-pressed={discount === amount} onClick={() => setDiscount(discount === amount && amount > 0 ? 0 : amount)}>{amount === 0 ? 'All' : `${amount}%+`}</button>)}
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}

function ShopHeader({ category, heading, search, onSearch }: { category: string; heading: string; search: string; onSearch: (value: string) => void }) {
  const detail = categories.find((item) => item.slug === category);
  return (
    <header className={`catalog-hero ${category ? `catalog-${category}` : 'catalog-all'}`}>
      <div className="catalog-artwork" />
      {detail && <div className="catalog-photo-wrap"><img src={detail.image} alt="" className="catalog-photo" /></div>}
      <div className="catalog-hero-inner">
        <p className="catalog-eyebrow">{category ? category.toUpperCase() : 'ALL PRODUCTS'}</p>
        <h1>{heading}</h1>
        <label className="search-control" htmlFor="product-search">
          <Search size={17} strokeWidth={1.4} aria-hidden="true" />
          <input id="product-search" type="search" placeholder="Search products..." aria-label="Search products" value={search} onChange={(event) => onSearch(event.target.value)} data-testid="input-product-search" />
        </label>
      </div>
    </header>
  );
}

function ActiveFilters({ category, setCategory, selectedBrands, toggleBrand, priceRange, setPriceRange, discount, setDiscount, search, setSearch }: {
  category: string; setCategory: (value: string) => void; selectedBrands: string[]; toggleBrand: (value: string) => void;
  priceRange: [number, number]; setPriceRange: (value: [number, number]) => void; discount: number; setDiscount: (value: number) => void;
  search: string; setSearch: (value: string) => void;
}) {
  const chips = [
    ...(category ? [{ label: categories.find((item) => item.slug === category)?.name || category, remove: () => setCategory('') }] : []),
    ...selectedBrands.map((brand) => ({ label: brand, remove: () => toggleBrand(brand) })),
    ...(priceRange[0] > 0 || priceRange[1] < 10000 ? [{ label: `${priceRange[0]} – ${priceRange[1] === 10000 ? 'Max' : priceRange[1]}`, remove: () => setPriceRange([0, 10000]) }] : []),
    ...(discount > 0 ? [{ label: `${discount}%+`, remove: () => setDiscount(0) }] : []),
    ...(search ? [{ label: `“${search}”`, remove: () => setSearch('') }] : []),
  ];
  if (!chips.length) return null;
  return <div className="active-filters" aria-label="Selected filters">{chips.map((chip) => <button key={chip.label} type="button" onClick={chip.remove}>{chip.label}<X size={12} /></button>)}</div>;
}

function Shop() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const query = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const category = query.get('category') || '';
  const titleByCategory: Record<string, string> = { bags: 'bags', shoes: 'shoes', clothing: 'clothing', accessories: 'accessories' };
  const heading = titleByCategory[category] || (query.get('gender') ? `${query.get('gender')![0].toUpperCase()}${query.get('gender')!.slice(1)}` : 'Shop All');
  const [search, setSearch] = useState(query.get('search') || '');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(query.get('brand')?.split(',').filter(Boolean) || []);
  const initialPriceMin = Number(query.get('priceMin')) || 0;
  const initialPriceMax = query.has('priceMax') ? Math.max(initialPriceMin, Number(query.get('priceMax')) || 0) : 10000;
  const [priceRange, setPriceRangeState] = useState<[number, number]>([initialPriceMin, initialPriceMax]);
  const [discount, setDiscountState] = useState(Number(query.get('minDiscount')) || 0);
  const [sort, setSortState] = useState(query.get('sort') || 'price-low');
  const [mobileFilters, setMobileFilters] = useState(false);
  useEffect(() => {
    setSearch(query.get('search') || '');
    setSelectedBrands(query.get('brand')?.split(',').filter(Boolean) || []);
    const min = Number(query.get('priceMin')) || 0;
    const max = query.has('priceMax') ? Math.max(min, Number(query.get('priceMax')) || 0) : 10000;
    setPriceRangeState([min, max]);
    setDiscountState(Number(query.get('minDiscount')) || 0);
    setSortState(query.get('sort') || 'price-low');
  }, [searchString]);
  useEffect(() => { document.title = `${heading} | Dirty Apple`; }, [heading]);
  const updateParam = (key: string, value: string, defaultValue = '') => {
    const next = new URLSearchParams(searchString);
    if (value && value !== defaultValue) next.set(key, value); else next.delete(key);
    setLocation(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
  };
  const setCategory = (value: string) => {
    updateParam('category', value);
  };
  const setSearchValue = (value: string) => {
    setSearch(value);
    updateParam('search', value);
  };
  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand) ? selectedBrands.filter((item) => item !== brand) : [...selectedBrands, brand];
    setSelectedBrands(next);
    updateParam('brand', next.join(','));
  };
  const setPriceRange = (value: [number, number]) => {
    setPriceRangeState(value);
    const next = new URLSearchParams(searchString);
    if (value[0] > 0) next.set('priceMin', String(value[0])); else next.delete('priceMin');
    if (value[1] < 10000) next.set('priceMax', String(value[1])); else next.delete('priceMax');
    setLocation(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
  };
  const setDiscount = (value: number) => {
    setDiscountState(value);
    updateParam('minDiscount', value ? String(value) : '');
  };
  const setSort = (value: string) => {
    setSortState(value);
    updateParam('sort', value, 'price-low');
  };
  const clear = () => {
    setSelectedBrands([]);
    setPriceRange([0, 10000]);
    setDiscount(0);
    setSearch('');
    setLocation('/shop');
  };
  return (
    <main className="catalog-page">
      <ShopHeader key={category || 'all'} category={category} heading={heading} search={search} onSearch={setSearchValue} />
      <div className="catalog-layout">
        <button className="mobile-filter-toggle" type="button" aria-expanded={mobileFilters} aria-controls="shop-filter-panel" onClick={() => setMobileFilters(!mobileFilters)} data-testid="button-toggle-filters">
          <SlidersHorizontal size={15} /> {mobileFilters ? 'HIDE FILTERS' : 'SHOW FILTERS'} <ChevronDown size={14} className={mobileFilters ? 'turned' : ''} />
        </button>
        <div id="shop-filter-panel" className={`filter-panel ${mobileFilters ? 'filters-visible' : ''}`}>
          <FilterSidebar category={category} setCategory={setCategory} selectedBrands={selectedBrands} toggleBrand={toggleBrand} priceRange={priceRange} setPriceRange={setPriceRange} discount={discount} setDiscount={setDiscount} clear={clear} />
        </div>
        <section className="catalog-results" aria-label="Shop products">
          <div className="results-toolbar">
            <p className="result-count">0 products</p>
            <label className="sort-control">
              <span>Sort by</span>
              <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)} data-testid="select-sort-products">
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
                <option value="discount">Biggest Discount</option>
                <option value="name">Name A-Z</option>
              </select>
              <ChevronDown size={13} />
            </label>
          </div>
          <ActiveFilters category={category} setCategory={setCategory} selectedBrands={selectedBrands} toggleBrand={toggleBrand} priceRange={priceRange} setPriceRange={setPriceRange} discount={discount} setDiscount={setDiscount} search={search} setSearch={setSearchValue} />
          <div className="empty-state shop-empty" role="status" data-testid="status-no-products">
            <span className="silver-stone" aria-hidden="true" />
            <p className="empty-title">No products found</p>
            <p className="empty-subtitle">Try adjusting your filters</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Sale() {
  const [sort, setSort] = useState('price-low');
  useEffect(() => { document.title = 'Sale | Dirty Apple'; }, []);
  return (
    <main className="catalog-page sale-page">
      <header className="sale-hero">
        <div className="sale-artwork" />
        <div className="sale-heading">
          <p className="catalog-eyebrow">COLLECTION</p>
          <h1>Sale</h1>
          <p className="sale-description">Explore current sale and discount listings. Prices and availability can change.</p>
        </div>
      </header>
      <section className="sale-results" aria-label="Sale collection">
        <div className="results-toolbar">
          <p className="result-count">0 pieces</p>
          <label className="sort-control">
            <span>Sort by</span>
            <select aria-label="Sort collection" value={sort} onChange={(event) => setSort(event.target.value)} data-testid="select-sort-sale">
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="discount">Biggest Discount</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
        <div className="empty-state sale-empty" role="status" data-testid="status-no-sale-listings">
          <span className="silver-stone" aria-hidden="true" />
          <p className="empty-title">No current listings</p>
          <p className="empty-subtitle">Check back as new items are added.</p>
          <Link href="/shop" className="empty-cta">SHOP ALL <ArrowUpRight size={13} strokeWidth={1.4} /></Link>
        </div>
      </section>
    </main>
  );
}

function NotFound() {
  return <main className="not-found"><span className="catalog-eyebrow">DIRTY APPLE</span><h1>Page not found</h1><Link href="/shop" className="empty-cta">Shop All <ArrowUpRight size={13} /></Link></main>;
}

function App() {
  useEffect(() => {
    document.title = 'Dirty Apple — Monochrome Atelier';
    const description = document.querySelector('meta[name="description"]') || document.createElement('meta');
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'Luxury Resale · Redefined');
    document.head.appendChild(description);
  }, []);
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/cart" component={Cart} />
        <Route path="/collections/sale" component={Sale} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
