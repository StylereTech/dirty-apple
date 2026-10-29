import { createHash } from 'node:crypto';
import { RequestHandler } from 'express';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** The browser creates a random UUID; there is no shared default cart. */
export const requireSession: RequestHandler = (req, res, next) => {
  const sessionId = req.get('x-session-id');
  if (!sessionId || !UUID_PATTERN.test(sessionId)) {
    res.status(400).json({ error: 'A valid X-Session-Id is required' });
    return;
  }
  res.locals.sessionHash = hashToken(sessionId);
  res.setHeader('Cache-Control', 'no-store');
  next();
};
