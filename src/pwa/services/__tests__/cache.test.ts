import { describe, it, expect, vi, beforeEach } from "vitest";
import { CACHE_VERSION, LEGACY_CACHES } from "../../constants";
import {
  getUserCacheNames,
  cleanupOldCaches,
  clearUserCaches,
  clearAllCaches,
  getCacheStats,
} from "../cache";

function createMockCache(name: string, entryCount = 0): Cache {
  const store = new Map<string, unknown>();
  for (let i = 0; i < entryCount; i++) {
    store.set(`https://example.com/resource/${i}`, {});
  }

  return {
    name,
    add: vi.fn(),
    addAll: vi.fn(),
    delete: vi.fn(async () => true),
    keys: vi.fn(async () =>
      [...store.keys()].map((url) => new Request(url)),
    ),
    match: vi.fn(),
    matchAll: vi.fn(),
    put: vi.fn(),
  } as unknown as Cache;
}

describe("cache", () => {
  const userId = "user-123";

  describe("getUserCacheNames", () => {
    it("returns correctly versioned cache names", () => {
      const names = getUserCacheNames(userId);
      expect(names.api).toBe(`watchbox-auth-api-${userId}-${CACHE_VERSION}`);
      expect(names.library).toBe(
        `watchbox-auth-library-${userId}-${CACHE_VERSION}`,
      );
    });
  });

  describe("cleanupOldCaches", () => {
    it("deletes legacy cache names", async () => {
      // Legacy caches are prefix-matched, so "lumen-public-static" matches
      // any key starting with that, including the current-versioned one.
      // This is by design: the legacy list identifies OLD cache names to clean up.
      const keysToDelete = [...LEGACY_CACHES];
      const keysToKeep = [
        `watchbox-auth-api-${userId}-${CACHE_VERSION}`,
        `watchbox-auth-library-${userId}-${CACHE_VERSION}`,
      ];

      vi.stubGlobal("caches", {
        keys: vi.fn(async () => [...keysToDelete, ...keysToKeep]),
        delete: vi.fn(async () => true),
      });

      await cleanupOldCaches();

      const deleteCalls = (caches.delete as ReturnType<typeof vi.fn>).mock.calls.map(
        (c: unknown[]) => c[0] as string,
      );
      for (const key of keysToDelete) {
        expect(deleteCalls).toContain(key);
      }
      for (const key of keysToKeep) {
        expect(deleteCalls).not.toContain(key);
      }
    });
  });

  describe("clearUserCaches", () => {
    it("deletes user-specific caches", async () => {
      const deleteFn = vi.fn(async () => true);
      vi.stubGlobal("caches", { delete: deleteFn });

      await clearUserCaches(userId);

      expect(deleteFn).toHaveBeenCalledWith(
        `watchbox-auth-api-${userId}-${CACHE_VERSION}`,
      );
      expect(deleteFn).toHaveBeenCalledWith(
        `watchbox-auth-library-${userId}-${CACHE_VERSION}`,
      );
    });
  });

  describe("clearAllCaches", () => {
    it("deletes all caches", async () => {
      const keys = ["cache-1", "cache-2", "cache-3"];
      const deleteFn = vi.fn(async () => true);
      vi.stubGlobal("caches", {
        keys: vi.fn(async () => keys),
        delete: deleteFn,
      });

      await clearAllCaches();

      expect(deleteFn).toHaveBeenCalledTimes(3);
      for (const key of keys) {
        expect(deleteFn).toHaveBeenCalledWith(key);
      }
    });
  });

  describe("getCacheStats", () => {
    it("returns cache entry counts", async () => {
      const cache1 = createMockCache("cache-1", 2);
      const cache2 = createMockCache("cache-2", 1);

      vi.stubGlobal("caches", {
        keys: vi.fn(async () => ["cache-1", "cache-2"]),
        open: vi.fn(async (name: string) => {
          if (name === "cache-1") return cache1;
          if (name === "cache-2") return cache2;
          return createMockCache(name);
        }),
      });

      const stats = await getCacheStats();
      expect(stats["cache-1"]).toBe(2);
      expect(stats["cache-2"]).toBe(1);
    });

    it("returns empty object when caches API unavailable", async () => {
      vi.stubGlobal("caches", undefined);
      const stats = await getCacheStats();
      expect(stats).toEqual({});
    });
  });
});
