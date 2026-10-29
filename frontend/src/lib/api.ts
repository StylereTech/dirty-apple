const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'dirty-apple-session';
let memorySession: string | undefined;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** A private random cart identifier, shared by this browser's tabs. */
export function getSessionId(): string {
  if (typeof window === 'undefined') throw new Error('Your shopping session is unavailable.');
  try {
    const saved = window.localStorage.getItem(SESSION_KEY);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) {
      memorySession = saved;
      return saved;
    }
  } catch { /* Browsers with storage disabled keep a session in this tab. */ }
  memorySession ||= window.crypto.randomUUID();
  try { window.localStorage.setItem(SESSION_KEY, memorySession); } catch { /* In-memory fallback. */ }
  return memorySession;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, withSession = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (withSession) headers.set('X-Session-Id', getSessionId());
  const response = await fetch(`${API}/api${path}`, { ...init, headers, cache: 'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(typeof data?.error === 'string' ? data.error : 'The service is unavailable. Please try again.', response.status);
  }
  if (data === null) throw new ApiError('The service returned an invalid response. Please try again.', response.status);
  return data as T;
}

export const cartRequest = <T>(path = '', init?: RequestInit) => apiRequest<T>(`/cart${path}`, init, true);

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'We could not connect. Please try again.';
}
