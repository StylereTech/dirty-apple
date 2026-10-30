'use client';

import { useState } from 'react';

interface FilterSidebarProps {
  brands: string[];
  categories: string[];
  selectedBrands: string[];
  selectedCategory: string;
  priceRange: [number, number];
  minDiscount: number;
  onBrandChange: (brand: string) => void;
  onCategoryChange: (category: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onDiscountChange: (discount: number) => void;
  onClear: () => void;
}

function FilterSection({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <div className="refined-filter-section border-b border-gray-200 pb-4 mb-4"><button onClick={onToggle} aria-expanded={expanded} className="flex items-center justify-between w-full font-inter text-xs tracking-[0.2em] mb-3 text-gray-600 hover:text-black">{title}<span className="text-lg leading-none">{expanded ? '−' : '+'}</span></button>{expanded && <div className="refined-filter-content">{children}</div>}</div>;
}

export default function FilterSidebar({
  brands, categories, selectedBrands, selectedCategory,
  priceRange, minDiscount, onBrandChange, onCategoryChange,
  onPriceChange, onDiscountChange, onClear,
}: FilterSidebarProps) {
  const [expanded, setExpanded] = useState({ category: true, brands: true, price: true, discount: true });
  const hasFilters = selectedBrands.length > 0 || selectedCategory || priceRange[0] > 0 || priceRange[1] < 10000 || minDiscount > 0;


  return (
    <div className="refined-filters w-full lg:w-56 flex-shrink-0">
      <div className="refined-filter-surface lg:sticky lg:top-28">
        <div className="flex items-center justify-between mb-6">
          <h2 className="filter-title font-inter text-xs tracking-[0.2em]"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 17h16" stroke="currentColor" strokeWidth="1.3" /><circle cx="9" cy="7" r="3" fill="currentColor" /><circle cx="15" cy="17" r="3" fill="currentColor" /></svg>FILTERS</h2>
          {hasFilters && (
            <button onClick={onClear} className="text-xs text-gray-500 hover:text-black underline font-inter">Clear all</button>
          )}
        </div>

        <FilterSection title="CATEGORY" expanded={expanded.category} onToggle={() => setExpanded(e => ({ ...e, category: !e.category }))}>
          <div className="filter-category-options space-y-2">
            {categories.map(c => (
              <button key={c} aria-pressed={selectedCategory.toLowerCase() === c.toLowerCase()} onClick={() => onCategoryChange(selectedCategory.toLowerCase() === c.toLowerCase() ? '' : c)}
                className={`block w-full text-left font-inter text-sm py-1 transition-colors ${selectedCategory.toLowerCase() === c.toLowerCase() ? 'text-black font-medium' : 'text-gray-500 hover:text-black'}`}>
                {c}
              </button>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="BRAND" expanded={expanded.brands} onToggle={() => setExpanded(e => ({ ...e, brands: !e.brands }))}>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {brands.map(b => (
              <label key={b} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => onBrandChange(b)}
                  className="accent-black w-3.5 h-3.5" />
                <span className={`font-inter text-sm ${selectedBrands.includes(b) ? 'text-black' : 'text-gray-500 group-hover:text-black'} transition-colors`}>{b}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="PRICE" expanded={expanded.price} onToggle={() => setExpanded(e => ({ ...e, price: !e.price }))}>
          <div className="filter-price-controls space-y-3">
            <div className="flex gap-2">
              <input type="number" min="0" aria-label="Minimum price" placeholder="Min" value={priceRange[0] || ''} onChange={e => onPriceChange([Math.max(0, Number(e.target.value) || 0), priceRange[1]])}
                className="w-full border border-gray-300 px-2 py-1.5 font-inter text-sm focus:outline-none focus:border-black" />
              <span className="self-center text-gray-400">–</span>
              <input type="number" min="0" aria-label="Maximum price" placeholder="Max" value={priceRange[1] === 10000 ? '' : priceRange[1]}
                onChange={e => onPriceChange([priceRange[0], e.target.value === '' ? 10000 : Math.max(0, Number(e.target.value))])}
                className="w-full border border-gray-300 px-2 py-1.5 font-inter text-sm focus:outline-none focus:border-black" />
            </div>
            <input aria-label="Maximum price slider" type="range" min="0" max="10000" step="100" value={priceRange[1]}
              onChange={e => onPriceChange([priceRange[0], Number(e.target.value)])}
              className="w-full accent-black" />
          </div>
        </FilterSection>

        <FilterSection title="MIN DISCOUNT" expanded={expanded.discount} onToggle={() => setExpanded(e => ({ ...e, discount: !e.discount }))}>
          <div className="filter-discounts flex flex-wrap gap-2">
            {[0, 10, 20, 30].map(d => (
              <button key={d} aria-pressed={minDiscount === d} onClick={() => onDiscountChange(minDiscount === d ? 0 : d)}
                className={`px-3 py-1.5 border text-xs font-inter transition-colors ${minDiscount === d && d > 0 ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black text-gray-600'}`}>
                {d === 0 ? 'All' : `${d}%+`}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
