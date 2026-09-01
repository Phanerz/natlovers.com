// A tiny in-memory cache for cheap, frequently-repeated admin aggregate
// reads (dashboard stats, sidebar badge counts). These are internal,
// single-admin numbers where a few seconds of staleness is invisible, but
// re-querying them from scratch on every page nav/tab switch is exactly
// the kind of redundant load that pushes this app's small connection pool
// (see max: 10 in lib/db/index.ts) into contention  -  the dashboard and
// the sidebar badges fire their own independent fetches on every /mimin
// load and can otherwise both hit the database within the same instant.
// Not a general-purpose cache: scoped deliberately to a handful of
// read-only aggregate functions that can tolerate brief staleness.
//
// Cached on globalThis for the same reason lib/db/index.ts caches its
// postgres client there  -  Next's dev server re-evaluates modules on every
// Fast Refresh, so a plain module-level Map would silently reset on every
// hot-reload and never actually cache anything during a dev session.
type CacheEntry = {value: unknown; expiresAt: number};

declare global {
  // eslint-disable-next-line no-var
  var __natloversTtlCache: Map<string, CacheEntry> | undefined;
}

const store = globalThis.__natloversTtlCache ?? new Map<string, CacheEntry>();
globalThis.__natloversTtlCache = store;

export async function withTtlCache<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  const value = await compute();
  store.set(key, {value, expiresAt: now + ttlMs});
  return value;
}

// Drops every cached entry whose key starts with `prefix`  -  used after a
// write that would make a cached read stale before its TTL naturally
// expires (e.g. deleting a product should not leave a 15-second-old
// "Products Listed" count on screen).
export function invalidateTtlCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
