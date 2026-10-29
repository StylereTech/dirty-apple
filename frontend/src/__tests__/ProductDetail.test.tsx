import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'silk-shirt' }) }));
vi.mock('@/lib/api', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api')>(), apiRequest: vi.fn(), cartRequest: vi.fn() }));

import ProductDetail from '@/app/product/[id]/page';
import { apiRequest, cartRequest, ApiError } from '@/lib/api';
import type { Product } from '@/lib/catalog';

const product: Product = { _id: '0123456789abcdef01234567', slug: 'silk-shirt', name: 'Silk Shirt', brand: 'Designer', category: 'clothing', originalPrice: 200, ourPrice: 100, discount: 50, images: [], sizes: [{ size: 'S', available: false }, { size: 'M', available: true }], retailerSource: 'Nordstrom', retailerUrl: 'https://www.nordstrom.com/s/silk-shirt/123', inStock: true };

beforeEach(() => vi.resetAllMocks());

describe('Product purchase flow', () => {
  it('renders an unavailable product for a 404 instead of crashing or loading forever', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError('Product not found', 404));
    render(<ProductDetail />);
    expect(await screen.findByRole('heading', { name: 'Product not available' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Loading product')).not.toBeInTheDocument();
  });

  it('offers an external retailer link without accepting a cart purchase', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ...product, purchaseMode: 'external' });
    render(<ProductDetail />);
    expect(await screen.findByRole('link', { name: /view at nordstrom/i })).toHaveAttribute('href', product.retailerUrl);
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    expect(cartRequest).not.toHaveBeenCalled();
  });

  it('requires an available size and does not claim success when the cart rejects the item', async () => {
    vi.mocked(apiRequest).mockResolvedValue(product);
    vi.mocked(cartRequest).mockRejectedValue(new ApiError('Item is no longer available', 409));
    render(<ProductDetail />);
    fireEvent.click(await screen.findByRole('button', { name: 'ADD TO CART' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an available size');
    expect(cartRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'S' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    fireEvent.click(screen.getByRole('button', { name: 'ADD TO CART' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Item is no longer available'));
    expect(JSON.parse(vi.mocked(cartRequest).mock.calls[0][1]?.body as string)).toEqual({ productId: product._id, quantity: 1, size: 'M' });
    expect(screen.queryByText('✓ ADDED TO CART')).not.toBeInTheDocument();
  });
});
