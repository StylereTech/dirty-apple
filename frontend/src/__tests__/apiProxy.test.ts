// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/[...path]/route';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('API proxy configuration and forwarding', () => {
  it('returns a clear503 without contacting localhost when production is unconfigured', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('API_URL', ''); vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const response = await GET(new NextRequest('https://dirtyapple.example/api/products'), { params: Promise.resolve({ path: ['products'] }) });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('not configured');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('forwards only required authentication and cart headers and preserves upstream errors', async () => {
    vi.stubEnv('API_URL', 'https://api.example.com');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Unavailable product' }), { status: 409, headers: { 'Content-Type': 'application/json' } }));
    const response = await POST(new NextRequest('https://dirtyapple.example/api/checkout?source=cart', { method: 'POST', headers: { authorization: 'Bearer admin-key', 'x-session-id': 'session-key', 'idempotency-key': 'attempt-key', 'x-order-token': 'order-access', 'stripe-signature': 'signed-payload', cookie: 'unrelated=private' }, body: '{}' }), { params: Promise.resolve({ path: ['checkout'] }) });
    expect(String(fetcher.mock.calls[0][0])).toBe('https://api.example.com/api/checkout?source=cart');
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get('x-session-id')).toBe('session-key');
    expect(headers.get('idempotency-key')).toBe('attempt-key');
    expect(headers.get('authorization')).toBe('Bearer admin-key');
    expect(headers.get('x-order-token')).toBe('order-access');
    expect(headers.get('stripe-signature')).toBe('signed-payload');
    expect(new TextDecoder().decode(fetcher.mock.calls[0][1]?.body as ArrayBuffer)).toBe('{}');
    expect(headers.get('cookie')).toBeNull();
    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
