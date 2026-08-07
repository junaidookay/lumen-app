import { clearUserCaches } from "./cache";
import { clearByUser } from "./sync-queue";

export async function cleanupOnLogout(userId: string): Promise<void> {
  await Promise.all([clearUserCaches(userId), clearByUser(userId)]);

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "CLEAR_USER_CACHES",
      payload: { userId },
    });
  }

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if ((key.startsWith("watchbox-") || key.startsWith("lumen-")) && key.includes(userId)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage unavailable
  }
}
