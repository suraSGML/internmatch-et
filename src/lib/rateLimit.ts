/**
 * Simple in-memory rate limiter for server actions / API routes.
 *
 * Limitations:
 *  - Resets on every cold start (fine for Vercel Edge / serverless at low scale).
 *  - For production at scale, replace the Map with an upstash/redis store.
 *
 * Usage:
 *   const result = rateLimit('register', ip, { limit: 3, windowMs: 60_000 });
 *   if (!result.ok) return { error: `Too many attempts. Try again in ${result.retryAfterSec}s.` };
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(
  prefix: string,
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${prefix}:${identifier}`;
  const now = Date.now();

  let entry = store.get(key);

  // Expired window → reset
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + options.windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  const remaining = Math.max(0, options.limit - entry.count);
  const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
  const ok = entry.count <= options.limit;

  return { ok, remaining, retryAfterSec };
}
