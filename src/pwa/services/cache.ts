import { CACHE_VERSION, CACHE_NAMES, LEGACY_CACHES } from "../constants";

export function getUserCacheNames(userId: string) {
  return {
    api: CACHE_NAMES.AUTH_API(userId),
    library: CACHE_NAMES.AUTH_LIBRARY(userId),
  };
}

export async function cleanupOldCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  const keys = await caches.keys();
  const validPrefixes = ["lumen-public-", "lumen-auth-", "lumen-offline-"];

  await Promise.all(
    keys
      .filter(
        (key) =>
          LEGACY_CACHES.some((legacy) => key.startsWith(legacy)) ||
          (validPrefixes.some((prefix) => key.startsWith(prefix)) && !key.endsWith(`-${CACHE_VERSION}`)),
      )
      .map((key) => caches.delete(key)),
  );
}

export async function clearUserCaches(userId: string): Promise<void> {
  if (typeof caches === "undefined") return;

  const names = getUserCacheNames(userId);
  await Promise.all([caches.delete(names.api), caches.delete(names.library)]);
}

export async function clearAllCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export async function getCacheStats(): Promise<Record<string, number>> {
  if (typeof caches === "undefined") return {};

  const stats: Record<string, number> = {};
  const keys = await caches.keys();

  for (const key of keys) {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    stats[key] = requests.length;
  }

  return stats;
}
