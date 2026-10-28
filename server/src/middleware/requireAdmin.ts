import { createHash, timingSafeEqual } from 'node:crypto';
import { Request, RequestHandler } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

export function isAdmin(req: Request): boolean {
  const configured = process.env.ADMIN_API_TOKEN;
  if (!configured || configured.length < 32) return false;
  const authorization = req.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  return provided.length > 0 && timingSafeEqual(digest(provided), digest(configured));
}

/** A server-only token. Never expose this value through NEXT_PUBLIC_* variables. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!process.env.ADMIN_API_TOKEN || process.env.ADMIN_API_TOKEN.length < 32) {
    res.status(503).json({ error: 'Administration is not configured' });
    return;
  }
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'Administrator authentication required' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
};
