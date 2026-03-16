import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

import Navbar from '../components/Navbar'

describe('Navbar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Navbar />)
    expect(container).toBeTruthy()
  })

  it('renders the logo image', () => {
    render(<Navbar />)
    expect(screen.getByAltText('Dirty Apple')).toBeInTheDocument()
  })

  it('renders desktop nav links', () => {
    render(<Navbar />)
    // Desktop and mobile menus both render, so use getAllByText
    expect(screen.getAllByText('Shop').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bags').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shoes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sale').length).toBeGreaterThan(0)
  })

  it('renders cart icon link pointing to /cart', () => {
    const { container } = render(<Navbar />)
    const cartAnchor = container.querySelector('a[href="/cart"]')
    expect(cartAnchor).toBeInTheDocument()
  })

  it('renders hamburger menu button', () => {
    render(<Navbar />)
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })
})
