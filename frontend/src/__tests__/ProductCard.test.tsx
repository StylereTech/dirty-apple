import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import ProductCard from '../components/ProductCard'

const mockProduct = {
  _id: 'abc123',
  name: 'Leather Tote Bag',
  slug: 'leather-tote-bag',
  brand: 'Gucci',
  category: 'bags',
  originalPrice: 200,
  ourPrice: 150,
  discount: 25,
  images: [],
  retailerSource: 'Nordstrom',
  inStock: true,
}

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Leather Tote Bag')).toBeInTheDocument()
  })

  it('renders brand name in uppercase', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('GUCCI')).toBeInTheDocument()
  })

  it('renders sale price', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })

  it('renders original price when discounted', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('$200.00')).toBeInTheDocument()
  })

  it('renders discount badge', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('−25%')).toBeInTheDocument()
  })

  it('links to the product slug page', () => {
    render(<ProductCard product={mockProduct} />)
    const link = document.querySelector('a[href="/product/leather-tote-bag"]')
    expect(link).toBeInTheDocument()
  })

  it('shows SOLD OUT overlay when out of stock', () => {
    render(<ProductCard product={{ ...mockProduct, inStock: false }} />)
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument()
  })

  it('does not show discount badge when no discount', () => {
    render(<ProductCard product={{ ...mockProduct, discount: 0 }} />)
    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument()
  })
})
