/**
 * Minimal in-memory rate limiter (fixed window per key, usually client IP).
 *
 * Good enough for a single-instance / low-traffic salon site. For multi-region
 * serverless at scale, swap the Map for a Supabase table or Upstash Redis —
 * see README "Scaling the rate limiter".
 */

interface Hit {
  count: number;
  resetAt: number;
}

const store = new Map<string, Hit>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key      identifier (e.g. IP address)
 * @param limit    max requests per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || now > hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (hit.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((hit.resetAt - now) / 1000),
    };
  }

  hit.count += 1;
  return { allowed: true, remaining: limit - hit.count, retryAfterSec: 0 };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

// Occasionally evict expired entries to bound memory.
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [k, v] of store) if (now > v.resetAt) store.delete(k);
    },
    10 * 60 * 1000,
  ).unref?.();
}
