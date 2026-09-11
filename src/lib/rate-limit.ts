// Lightweight in-memory sliding-window rate limiter.
//
// NOTE: in-memory state does not survive a serverless cold start and is per-process, so this is
// best-effort and appropriate for a single-instance / self-hosted deployment. For horizontally
// scaled or serverless deployments, replace with a shared store (Upstash/Redis) in the same shape.
// It's enabled per-endpoint via an env flag.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const DEFAULT_WINDOW_MS = 60 * 1000;

/** Ticks a bucket for `key`; returns whether the request is allowed and how many remain. */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number = DEFAULT_WINDOW_MS
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  return { allowed: bucket.count <= max, remaining: Math.max(0, max - bucket.count) };
}

/** Small housekeeping so the Map doesn't grow unbounded (runs opportunistically). */
export function pruneRateLimitBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
