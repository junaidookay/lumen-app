/**
 * TMDB HTTP client. Server-only.
 *
 * - Reads the v4 Read Access Token from TMDB_ACCESS_TOKEN.
 * - Adds an in-memory request cache with a short TTL per endpoint.
 * - Deduplicates concurrent requests to the same URL.
 *
 * All content services must go through this module. No component or
 * client-side code should import it (blocked by the `.server` suffix).
 */

const BASE_URL = "https://api.themoviedb.org/3";

type CacheEntry = { at: number; ttl: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export interface TMDBError extends Error {
  status?: number;
  code?: number;
}

function keyFor(path: string, query?: Record<string, string | number | boolean | undefined>) {
  if (!query) return path;
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${path}?${parts.join("&")}` : path;
}

function chooseTTL(path: string): number {
  // Trending / discover / lists refresh more often; details / static rarely change.
  if (path.startsWith("/trending")) return 15 * 60 * 1000; // 15 min
  if (path.startsWith("/search")) return 5 * 60 * 1000; // 5 min
  if (path.startsWith("/discover")) return 30 * 60 * 1000; // 30 min
  if (path.startsWith("/genre")) return 24 * 60 * 60 * 1000; // 24h
  if (path.startsWith("/configuration")) return 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000; // 1h default
}

async function readToken(): Promise<string> {
  // Check settings table first, fall back to env var
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("settings")
      .select("value")
      .eq("key", "tmdb_api_key")
      .maybeSingle();
    if (data?.value) return data.value;
  } catch {
    // Settings table not available yet — fall through to env var
  }
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) {
    const err = new Error(
      "TMDB API key not configured. Set it in Admin → Settings or via TMDB_ACCESS_TOKEN env var.",
    ) as TMDBError;
    err.status = 500;
    throw err;
  }
  return token;
}

export interface TMDBFetchOptions {
  query?: Record<string, string | number | boolean | undefined>;
  /** Override cache TTL in ms. Set to 0 to bypass the cache. */
  ttl?: number;
  /** Force a fresh fetch, ignoring cached data (still populates cache). */
  fresh?: boolean;
  signal?: AbortSignal;
}

export async function tmdbFetch<T>(path: string, opts: TMDBFetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const cacheKey = keyFor(path, opts.query);
  const ttl = opts.ttl ?? chooseTTL(path);

  if (!opts.fresh && ttl > 0) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.data as T;
  }

  const existing = inflight.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const params = new URLSearchParams();
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }
  }
  const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

  const token = await readToken();
  const promise = (async () => {
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: opts.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(
        `TMDB ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      ) as TMDBError;
      err.status = res.status;
      throw err;
    }
    const data = (await res.json()) as T;
    if (ttl > 0) cache.set(cacheKey, { at: Date.now(), ttl, data });
    return data;
  })().finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, promise);
  return promise;
}

/** Manual cache invalidation for a path prefix (e.g. `/trending`). */
export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
