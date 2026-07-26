/** In-memory rate limit — per user per minute (dev/single-instance). */
const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_PER_USER_PER_MINUTE = 8;
const WINDOW_MS = 60_000;

export function checkEmailRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = buckets.get(userId);
  if (!entry || now >= entry.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_USER_PER_MINUTE) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function resetEmailRateLimitForTests(): void {
  buckets.clear();
}
