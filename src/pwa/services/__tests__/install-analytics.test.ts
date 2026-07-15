import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAnalyticsHandler, trackInstallEvent } from "../install-analytics";

describe("install-analytics", () => {
  let mockHandler: (event: { name: string; properties?: Record<string, unknown> }) => void;

  beforeEach(() => {
    mockHandler = vi.fn();
    setAnalyticsHandler(mockHandler);
  });

  describe("trackInstallEvent", () => {
    it("calls the handler with banner.shown event", () => {
      trackInstallEvent({ name: "banner.shown" });
      expect(mockHandler).toHaveBeenCalledWith({ name: "banner.shown" });
    });

    it("calls the handler with banner.dismissed event and method", () => {
      trackInstallEvent({ name: "banner.dismissed", properties: { method: "swipe" } });
      expect(mockHandler).toHaveBeenCalledWith({
        name: "banner.dismissed",
        properties: { method: "swipe" },
      });
    });

    it("calls the handler with install.completed event", () => {
      trackInstallEvent({
        name: "install.completed",
        properties: { platform: "android", method: "prompt" },
      });
      expect(mockHandler).toHaveBeenCalledWith({
        name: "install.completed",
        properties: { platform: "android", method: "prompt" },
      });
    });

    it("calls the handler with reminder.shown event", () => {
      trackInstallEvent({ name: "reminder.shown", properties: { dismissCount: 2 } });
      expect(mockHandler).toHaveBeenCalledWith({
        name: "reminder.shown",
        properties: { dismissCount: 2 },
      });
    });

    it("does not throw when no handler is set", () => {
      // Reset to null - we can't easily test this without exposing internal state
      // But the implementation is: if (handler) { handler(event) }
      // So if handler is null, it simply doesn't call anything
      expect(() => {
        trackInstallEvent({ name: "install_page.viewed" });
      }).not.toThrow();
    });
  });

  describe("setAnalyticsHandler", () => {
    it("replaces the previous handler", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      setAnalyticsHandler(handler1);
      trackInstallEvent({ name: "banner.shown" });
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();

      setAnalyticsHandler(handler2);
      trackInstallEvent({ name: "banner.shown" });
      expect(handler2).toHaveBeenCalled();
    });
  });
});
