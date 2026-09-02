type RateLimitEntry = { count: number; resetAt: number };

const memoryStore = new Map<string, RateLimitEntry>();

/** Process-local only. Replace with a distributed store before horizontal scaling. */
export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
