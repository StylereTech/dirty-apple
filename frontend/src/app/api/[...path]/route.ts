import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const configured = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');
  if (!configured) return NextResponse.json({ error: 'The store service is not configured yet. Please try again later.' }, { status: 503 });
  try {
    const upstream = new URL(configured);
    if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password) throw new Error('Invalid API configuration');
    const { path } = await context.params;
    if (path.some(segment => segment === '.' || segment === '..' || segment.includes('\0'))) return NextResponse.json({ error: 'Invalid API path.' }, { status: 400 });
    upstream.pathname = `${upstream.pathname.replace(/\/$/, '')}/api/${path.map(encodeURIComponent).join('/')}`;
    upstream.search = request.nextUrl.search;
    const headers = new Headers();
    for (const name of ['content-type', 'authorization', 'x-session-id', 'idempotency-key', 'x-order-token', 'stripe-signature']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (Number(request.headers.get('content-length')) > 5 * 1024 * 1024) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 5 * 1024 * 1024) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    const response = await fetch(upstream, { method: request.method, headers, body, signal: AbortSignal.timeout(60000), cache: 'no-store', redirect: 'error' });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of ['content-type', 'retry-after']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'The store service is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}

export { proxy as GET, proxy as HEAD, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
