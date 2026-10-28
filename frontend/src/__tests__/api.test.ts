import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, cartRequest, getSessionId } from '@/lib/api';

describe('API session and error handling', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('persists a private cart UUID and sends it on every cart request', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const session = getSessionId();
    expect(session).toMatch(/^[a-f\d]{8}-[a-f\d-]{27}$/i);
    await cartRequest();
    await cartRequest('', { method: 'POST', body: '{}' });
    expect(getSessionId()).toBe(session);
    for (const [, options] of fetcher.mock.calls) expect(new Headers(options?.headers).get('X-Session-Id')).toBe(session);
  });

  it('never uses a legacy shared default session', () => {
    localStorage.setItem('dirty-apple-session', 'default');
    expect(getSessionId()).not.toBe('default');
  });

  it('rejects a failed response instead of treating error JSON as inventory', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Store unavailable' }), { status: 503 }));
    await expect(apiRequest('/products')).rejects.toMatchObject({ name: 'ApiError', status: 503, message: 'Store unavailable' });
  });
});
