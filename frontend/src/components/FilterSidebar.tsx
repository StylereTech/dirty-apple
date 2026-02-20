'use client';

import { useState } from 'react';

interface FilterSidebarProps {
  brands: string[];
  categories: string[];
  sizes: string[];
  selectedBrands: string[];
  selectedCategory: string;
  selectedSizes: string[];
  priceRange: [number, number];
  onBrandChange: (brand: string) => void;
  onCategoryChange: (category: string) => void;
  onSizeChange: (size: string) => void;
  onPriceChange: (range: [number, number]) => void;
}

export default function FilterSidebar({
  brands,
  categories,
  sizes,
  selectedBrands,
  selectedCategory,
  selectedSizes,
  priceRange,
  onBrandChange,
  onCategoryChange,
  onSizeChange,
  onPriceChange,
}: FilterSidebarProps) {
  const [expanded, setExpanded] = useState({
    brands: true,
    category: true,
    price: true,
    size: true,
  });

  const toggleSection = (section: keyof typeof expanded) => {
    setExpanded({ ...expanded, [section]: !expanded[section] });
  };

  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="lg:sticky lg:top-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-playfair text-lg">Filters</h2>
          {(selectedBrands.length > 0 || selectedCategory || selectedSizes.length > 0) && (
            <button
              onClick={() => {
                selectedBrands.forEach(b => onBrandChange(b));
                selectedSizes.forEach(s => onSizeChange(s));
                onCategoryChange('');
                onPriceChange([0, 10000]);
              }}
              className="text-sm text-gray hover:text-black underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <button
            onClick={() => toggleSection('category')}
            className="flex items-center justify-between w-full font-inter text-sm tracking-widest mb-3"
          >
            CATEGORY
            <span>{expanded.category ? '−' : '+'}</span>
          </button>
          {expanded.category && (
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === category}
                    onChange={() => onCategoryChange(selectedCategory === category ? '' : category)}
                    className="accent-black"
                  />
                  <span className="font-inter text-sm text-gray">{category}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Brand Filter */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <button
            onClick={() => toggleSection('brands')}
            className="flex items-center justify-between w-full font-inter text-sm tracking-widest mb-3"
          >
            BRAND
            <span>{expanded.brands ? '−' : '+'}</span>
          </button>
          {expanded.brands && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {brands.map((brand) => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => onBrandChange(brand)}
                    className="accent-black"
                  />
                  <span className="font-inter text-sm text-gray">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price Filter */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full font-inter text-sm tracking-widest mb-3"
          >
            PRICE
            <span>{expanded.price ? '−' : '+'}</span>
          </button>
          {expanded.price && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ''}
                  onChange={(e) => onPriceChange([Number(e.target.value) || 0, priceRange[1]])}
                  className="w-full border border-gray-300 px-2 py-1 font-inter text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] === 10000 ? '' : priceRange[1] || ''}
                  onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value) || 10000])}
                  className="w-full border border-gray-300 px-2 py-1 font-inter text-sm"
                />
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={priceRange[1]}
                onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value)])}
                className="w-full accent-black"
              />
              <div className="flex justify-between text-xs text-gray font-inter">
                <span>${priceRange[0].toLocaleString()}</span>
                <span>${priceRange[1].toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Size Filter */}
        <div className="pb-4">
          <button
            onClick={() => toggleSection('size')}
            className="flex items-center justify-between w-full font-inter text-sm tracking-widest mb-3"
          >
            SIZE
            <span>{expanded.size ? '−' : '+'}</span>
          </button>
          {expanded.size && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => onSizeChange(size)}
                  className={`px-3 py-1 border text-sm font-inter transition-colors ${
                    selectedSizes.includes(size)
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-black'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
