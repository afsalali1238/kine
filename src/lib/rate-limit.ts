/**
 * Best-effort sliding-window rate limiter for the recovery API.
 *
 * In-memory and per-process: on serverless/multi-instance deployments each
 * instance enforces its own window, so treat this as abuse damping, not a
 * hard guarantee. The shape is a pure function of (key, now) so it can be
 * tested deterministically.
 *
 * Bounded by construction. Both halves of the caller's key are attacker
 * controlled, so an unbounded key space must not mean unbounded memory:
 * expired buckets are swept at most once per window (amortised O(1) per call)
 * and `maxBuckets` is a hard ceiling that fails closed rather than growing.
 */
type Bucket = { count: number; resetAt: number };

/** Hard ceiling on retained buckets per limiter. */
export const MAX_RATE_LIMIT_BUCKETS = 5_000;

export function createRateLimiter({
  limit,
  windowMs,
  maxBuckets = MAX_RATE_LIMIT_BUCKETS,
}: {
  limit: number;
  windowMs: number;
  maxBuckets?: number;
}) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = 0;

  /** Drop every bucket whose window has closed. O(n) but at most once per window. */
  const sweep = (now: number) => {
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  };

  return (key: string, now: number = Date.now()): boolean => {
    if (now - lastSweep >= windowMs) {
      sweep(now);
      lastSweep = now;
    }

    const bucket = buckets.get(key);
    if (bucket && now < bucket.resetAt) {
      bucket.count += 1;
      return bucket.count <= limit;
    }

    // A new key needs a slot. If we are at the ceiling, reclaim expired entries
    // first; if that is not enough, refuse rather than allocate without bound.
    if (buckets.size >= maxBuckets) {
      sweep(now);
      if (buckets.size >= maxBuckets) return false;
    }

    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  };
}

const putLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
const getLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export function checkRecoveryRateLimit(key: string, kind: 'read' | 'write' = 'write', now?: number): boolean {
  return (kind === 'write' ? putLimiter : getLimiter)(key, now);
}
