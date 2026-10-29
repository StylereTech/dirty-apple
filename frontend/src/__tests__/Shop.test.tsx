import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
const query = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => query.value }));
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
});
