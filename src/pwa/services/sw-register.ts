import { cleanupOldCaches } from "./cache";

let swRegistration: ServiceWorkerRegistration | null = null;
let hasUpdate = false;
let isPlaying = false;
const updateCallbacks: Array<(hasUpdate: boolean) => void> = [];

export function onSWUpdate(callback: (hasUpdate: boolean) => void) {
  updateCallbacks.push(callback);
  callback(hasUpdate && !isPlaying);
  return () => {
    const idx = updateCallbacks.indexOf(callback);
    if (idx >= 0) updateCallbacks.splice(idx, 1);
  };
}

export function setPlaybackState(playing: boolean) {
  isPlaying = playing;
  if (!playing && hasUpdate) {
    updateCallbacks.forEach((cb) => cb(true));
  } else if (playing) {
    updateCallbacks.forEach((cb) => cb(false));
  }
}

export function applyUpdate() {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
  window.location.reload();
}

export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  cleanupOldCaches().catch(() => {});

  window.addEventListener("load", async () => {
    try {
      swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      swRegistration.addEventListener("updatefound", () => {
        const newWorker = swRegistration?.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            hasUpdate = true;
            if (!isPlaying) {
              updateCallbacks.forEach((cb) => cb(true));
            }
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        hasUpdate = false;
        updateCallbacks.forEach((cb) => cb(false));
      });
    } catch (error) {
      console.error("SW registration failed:", error);
    }
  });
}
