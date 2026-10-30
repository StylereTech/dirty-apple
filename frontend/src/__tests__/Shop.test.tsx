import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
const query = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => query.value, usePathname: () => '/shop', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api')>(), apiRequest: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
import Shop from '@/app/shop/page';
import { apiRequest } from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiRequest).mockResolvedValue({ products: [], brands: [], categories: [], total: 0, totalPages: 0, page: 1 });
});

describe('Shop navigation filters', () => {
  it('honors featured and gender links and clears old brand/search filters on navigation', async () => {
    query.value = new URLSearchParams('brand=Designer&search=coat&featured=true&gender=women');
    const { rerender } = render(<Shop />);
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    let path = vi.mocked(apiRequest).mock.calls.at(-1)![0];
    expect(path).toContain('brand=Designer');
    expect(path).toContain('search=coat');
    expect(path).toContain('featured=true');
    expect(path).toContain('gender=women');
    query.value = new URLSearchParams('category=bags');
    rerender(<Shop />);
    await waitFor(() => expect(vi.mocked(apiRequest).mock.calls.at(-1)![0]).toContain('category=bags'));
    path = vi.mocked(apiRequest).mock.calls.at(-1)![0];
    expect(path).not.toContain('brand=');
    expect(path).not.toContain('search=');
    expect(path).not.toContain('featured=');
    expect(path).not.toContain('gender=');
  });

  it('renders actual API products instead of the concept empty state', async () => {
    query.value = new URLSearchParams('category=bags');
    vi.mocked(apiRequest).mockResolvedValue({ products: [{
      _id: 'verified-bag', slug: 'verified-bag', name: 'Verified bag', brand: 'Prada', category: 'bags',
      originalPrice: 300, ourPrice: 225, discount: 25, images: ['/cat-bags.jpg'], retailerSource: 'Saks',
      inStock: true, purchaseMode: 'external',
    }], total: 1, totalPages: 1, page: 1 });
    render(<Shop />);
    expect(await screen.findByText('Verified bag')).toBeInTheDocument();
    expect(screen.getByText('1 product')).toBeInTheDocument();
    expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Verified bag/i })).toHaveAttribute('href', '/product/verified-bag');
  });

  it('shows a service error rather than claiming the catalog is empty', async () => {
    query.value = new URLSearchParams();
    vi.mocked(apiRequest).mockRejectedValue(new Error('offline'));
    render(<Shop />);
    expect(await screen.findByText('Products unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No products found')).not.toBeInTheDocument();
  });
});
