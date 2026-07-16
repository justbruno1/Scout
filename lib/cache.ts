// Minimal in-memory cache with TTL, used to keep Scout inside the free-tier
// rate limits of CoinGecko / DexScreener / GeckoTerminal / GoPlus.
// This is process-local (fine for a single Vercel serverless instance during
// a burst of requests, and trivially swappable for Redis/Upstash later).

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearCache() {
  store.clear();
}
