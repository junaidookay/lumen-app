import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCapabilities,
  hasCapability,
  requireCapability,
  resetCapabilities,
} from "../capabilities";

beforeEach(() => {
  (self as any).registration = (self as any).registration ?? {};
  resetCapabilities();
  vi.unstubAllGlobals();
});

describe("capabilities", () => {
  describe("getCapabilities", () => {
    it("returns an object with all 18 capability keys", () => {
      const caps = getCapabilities();
      const expectedKeys = [
        "install", "share", "clipboard", "wakeLock", "pictureInPicture",
        "orientation", "fullscreen", "notifications", "push", "bluetooth",
        "airplay", "chromecast", "backgroundPlayback", "mediaSession",
        "webWorkers", "CacheStorage", "IndexedDB", "navigationPreload",
      ];
      for (const key of expectedKeys) {
        expect(key in caps).toBe(true);
        expect(typeof caps[key as keyof typeof caps]).toBe("boolean");
      }
    });

    it("caches the result across calls", () => {
      const first = getCapabilities();
      const second = getCapabilities();
      expect(first).toBe(second);
    });
  });

  describe("resetCapabilities", () => {
    it("clears the cache so next call returns a new object", () => {
      const first = getCapabilities();
      resetCapabilities();
      const second = getCapabilities();
      expect(first).not.toBe(second);
    });
  });

  describe("hasCapability", () => {
    it("returns a boolean for any capability", () => {
      expect(typeof hasCapability("share")).toBe("boolean");
      expect(typeof hasCapability("clipboard")).toBe("boolean");
      expect(typeof hasCapability("wakeLock")).toBe("boolean");
      expect(typeof hasCapability("webWorkers")).toBe("boolean");
    });

    it("returns false for capabilities not available in jsdom", () => {
      expect(hasCapability("IndexedDB")).toBe(false);
      expect(hasCapability("CacheStorage")).toBe(false);
    });
  });

  describe("requireCapability", () => {
    it("throws for an unsupported capability", () => {
      expect(() => requireCapability("IndexedDB")).toThrow(
        'Capability "IndexedDB" is not supported',
      );
    });

    it("throws with correct message for any unsupported capability", () => {
      const caps = getCapabilities();
      const unsupportedKeys = Object.keys(caps).filter(
        (k) => caps[k as keyof typeof caps] === false,
      );
      for (const key of unsupportedKeys) {
        expect(() =>
          requireCapability(key as keyof typeof caps),
        ).toThrow(`Capability "${key}" is not supported`);
      }
    });
  });
});
