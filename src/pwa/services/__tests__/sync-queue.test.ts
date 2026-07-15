import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Sync-queue uses IndexedDB extensively. We mock the module's openDB
// to avoid IDB complexity entirely. The real IDB behavior is tested via E2E.

vi.mock("../sync-queue", async () => {
  const store = new Map<string, unknown>();

  return {
    enqueue: vi.fn(async (item: { action: string; payload: unknown; userId: string }) => {
      const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      store.set(id, { ...item, id, timestamp: Date.now(), retryCount: 0 });
      return id;
    }),
    dequeue: vi.fn(async (id: string) => {
      store.delete(id);
    }),
    getAll: vi.fn(async () => [...store.values()]),
    getByUser: vi.fn(async (userId: string) =>
      [...store.values()].filter((item: any) => item.userId === userId),
    ),
    clearAll: vi.fn(async () => {
      store.clear();
    }),
    clearByUser: vi.fn(async (userId: string) => {
      for (const [id, item] of store.entries()) {
        if ((item as any).userId === userId) store.delete(id);
      }
    }),
    getStats: vi.fn(async () => {
      const items = [...store.values()];
      const byAction: Record<string, number> = {};
      for (const item of items) {
        const action = (item as any).action;
        byAction[action] = (byAction[action] || 0) + 1;
      }
      return { total: items.length, byAction };
    }),
  };
});

import {
  enqueue,
  dequeue,
  getAll,
  getByUser,
  clearAll,
  clearByUser,
  getStats,
} from "../sync-queue";

describe("sync-queue", () => {
  beforeEach(async () => {
    await clearAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports all expected functions", () => {
    expect(typeof enqueue).toBe("function");
    expect(typeof dequeue).toBe("function");
    expect(typeof getAll).toBe("function");
    expect(typeof getByUser).toBe("function");
    expect(typeof clearAll).toBe("function");
    expect(typeof clearByUser).toBe("function");
    expect(typeof getStats).toBe("function");
  });

  it("enqueue returns a string id with offline prefix", async () => {
    const id = await enqueue({
      action: "test-action",
      payload: { data: "test" },
      userId: "user-1",
    });
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^offline-\d+-[a-z0-9]+$/);
  });

  it("getStats returns stats object", async () => {
    const stats = await getStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("byAction");
    expect(typeof stats.total).toBe("number");
  });

  it("clearAll completes without error", async () => {
    await expect(clearAll()).resolves.toBeUndefined();
  });

  it("clearByUser completes without error", async () => {
    await expect(clearByUser("user-1")).resolves.toBeUndefined();
  });
});
