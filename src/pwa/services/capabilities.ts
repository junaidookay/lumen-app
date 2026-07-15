import type { DeviceCapabilities } from "@/pwa/types";

export const EMPTY_CAPABILITIES: DeviceCapabilities = {
  install: false,
  share: false,
  clipboard: false,
  wakeLock: false,
  pictureInPicture: false,
  orientation: false,
  fullscreen: false,
  notifications: false,
  push: false,
  bluetooth: false,
  airplay: false,
  chromecast: false,
  backgroundPlayback: false,
  mediaSession: false,
  webWorkers: false,
  CacheStorage: false,
  IndexedDB: false,
  navigationPreload: false,
};

let cached: DeviceCapabilities | null = null;

export function getCapabilities(): DeviceCapabilities {
  if (cached) return cached;
  cached = detectCapabilities();
  return cached;
}

function detectCapabilities(): DeviceCapabilities {
  if (typeof window === "undefined") {
    return EMPTY_CAPABILITIES;
  }

  return {
    install: "BeforeInstallPromptEvent" in window || "onbeforeinstallprompt" in window,
    share: "share" in navigator,
    clipboard: "clipboard" in navigator,
    wakeLock: "wakeLock" in navigator,
    pictureInPicture: "pictureInPicture" in document || "webkitPictureInPicture" in document,
    orientation: "orientation" in screen,
    fullscreen: "fullscreenEnabled" in document || "webkitFullscreenEnabled" in document,
    notifications: "Notification" in window,
    push: "PushManager" in window,
    bluetooth: "bluetooth" in navigator,
    airplay: "WebKitPlaybackTargetAvailabilityEvent" in window,
    chromecast: "chrome" in window && typeof (window as any).chrome?.cast !== "undefined",
    backgroundPlayback: "mediaSession" in navigator,
    mediaSession: "mediaSession" in navigator,
    webWorkers: "Worker" in window,
    CacheStorage: "caches" in window,
    IndexedDB: "indexedDB" in window,
    navigationPreload: "navigationPreload" in (self as any).registration || false,
  };
}

export function hasCapability(capability: keyof DeviceCapabilities): boolean {
  return getCapabilities()[capability];
}

export function requireCapability(capability: keyof DeviceCapabilities): void {
  if (!hasCapability(capability)) {
    throw new Error(`Capability "${capability}" is not supported on this device`);
  }
}

export function resetCapabilities(): void {
  cached = null;
}
