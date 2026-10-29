import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { confirmCardPayment } = vi.hoisted(() => ({ confirmCardPayment: vi.fn() }));
vi.mock('@stripe/react-stripe-js', () => ({ Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>, CardElement: () => <div>Card</div>, useStripe: () => ({ confirmCardPayment }), useElements: () => ({ getElement: () => ({}) }) }));
vi.mock('@/lib/stripe/client', () => ({ getStripe: () => Promise.resolve(null) }));
vi.mock('@/lib/api', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/api')>(), apiRequest: vi.fn(), cartRequest: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import CheckoutPayment from '@/components/checkout/CheckoutPayment';
import { ApiError, apiRequest, cartRequest } from '@/lib/api';

const items = [{ _id: 'cart-1', productId: '0123456789abcdef01234567', name: 'Shirt', brand: 'Brand', image: '', price: 100, size: 'M', quantity: 1 }];
const setup = { clientSecret: 'pi_123_secret', paymentIntentId: 'pi_123', paymentStatus: 'requires_payment_method', orderAccessToken: 'opaque-token', orderId: 'order1', subtotal: 100, shipping: 15, total: 115 };

beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear();
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_valid123');
  Object.defineProperty(window.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  vi.mocked(cartRequest).mockResolvedValue({ items: [], subtotal: 0, count: 0 });
  confirmCardPayment.mockResolvedValue({ paymentIntent: { id: 'pi_123', status: 'succeeded' } });
});

function fillAndSubmit() {
  for (const [label, value] of [['Email', 'shopper@example.com'], ['First name', 'A'], ['Last name', 'Customer'], ['Street address', '123 Main Street'], ['City', 'Dallas'], ['State', 'TX'], ['ZIP code', '75201']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(screen.getByRole('button', { name: 'PAY $115.00' }).closest('form')!);
}

describe('Checkout payment confirmation', () => {
  it('keeps a paid order pending on confirmation failure and retries without charging again', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(setup).mockRejectedValueOnce(new Error('Database unavailable')).mockResolvedValueOnce({ orderNumber: 'DA-123', paymentStatus: 'paid' });
    render(<CheckoutPayment items={items} subtotal={100} onQuote={vi.fn()} />);
    fillAndSubmit();
    const retry = await screen.findByRole('button', { name: 'RETRY CONFIRMATION' });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(screen.queryByText('Order Confirmed')).not.toBeInTheDocument();
    expect(confirmCardPayment).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('dirty-apple-pending-confirmation')).toContain('pi_123');
    fireEvent.click(retry);
    expect(await screen.findByText('Order Confirmed')).toBeInTheDocument();
    expect(confirmCardPayment).toHaveBeenCalledTimes(1);
    const requests = vi.mocked(apiRequest).mock.calls;
    expect(requests[0][1]?.headers).toMatchObject({ 'Idempotency-Key': expect.stringMatching(/^[\da-f-]{36}$/i) });
    expect(JSON.parse(requests[0][1]?.body as string).items).toEqual([{ productId: items[0].productId, quantity: 1, size: 'M' }]);
    expect(JSON.parse(requests[2][1]?.body as string)).toEqual({ paymentIntentId: 'pi_123', orderAccessToken: 'opaque-token' });
  });

  it('requires review when the server total changes before charging', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ...setup, subtotal: 120, total: 135 });
    const onQuote = vi.fn();
    render(<CheckoutPayment items={items} subtotal={100} onQuote={onQuote} />);
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('current total is $135.00');
    expect(confirmCardPayment).not.toHaveBeenCalled();
    expect(onQuote).toHaveBeenCalledWith({ subtotal: 120, shipping: 15, total: 135 });
  });
  it.each(['processing', 'requires_capture'])('recovers an existing %s intent without another card confirmation', async status => {
    vi.mocked(apiRequest).mockReset().mockResolvedValueOnce({ ...setup, paymentStatus: status }).mockRejectedValueOnce(new Error('Not settled yet'));
    render(<CheckoutPayment items={items} subtotal={100} onQuote={vi.fn()} />);
    fillAndSubmit();
    expect(await screen.findByRole('button', { name: 'RETRY CONFIRMATION' })).toBeInTheDocument();
    expect(confirmCardPayment).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('dirty-apple-pending-confirmation')).toContain('pi_123');
    expect(screen.queryByRole('button', { name: /PAY \$/ })).not.toBeInTheDocument();
  });

  it('preserves a processing intent returned with a Stripe error for safe confirmation retry', async () => {
    vi.mocked(apiRequest).mockReset().mockResolvedValueOnce(setup).mockRejectedValueOnce(new Error('Not settled yet'));
    confirmCardPayment.mockResolvedValue({ error: { message: 'Payment processing', payment_intent: { id: 'pi_123', status: 'processing' } } });
    render(<CheckoutPayment items={items} subtotal={100} onQuote={vi.fn()} />);
    fillAndSubmit();
    expect(await screen.findByRole('button', { name: 'RETRY CONFIRMATION' })).toBeInTheDocument();
    expect(sessionStorage.getItem('dirty-apple-pending-confirmation')).toContain('pi_123');
    expect(confirmCardPayment).toHaveBeenCalledTimes(1);
  });

  it('starts a new key only after an explicit retry of a cancelled or refunded checkout', async () => {
    vi.mocked(apiRequest).mockReset().mockRejectedValueOnce(new ApiError('Previous checkout was cancelled. Start again.', 410)).mockResolvedValueOnce(setup).mockResolvedValueOnce({ orderNumber: 'DA-456', paymentStatus: 'paid' });
    render(<CheckoutPayment items={items} subtotal={100} onQuote={vi.fn()} />);
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Previous checkout was cancelled');
    expect(confirmCardPayment).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('dirty-apple-checkout-attempt')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'PAY $115.00' })).toBeEnabled());
    fillAndSubmit();
    expect(await screen.findByText('Order Confirmed')).toBeInTheDocument();
    const [first, second] = vi.mocked(apiRequest).mock.calls;
    expect(new Headers(first[1]?.headers).get('Idempotency-Key')).not.toBe(new Headers(second[1]?.headers).get('Idempotency-Key'));
    expect(confirmCardPayment).toHaveBeenCalledTimes(1);
  });

});
