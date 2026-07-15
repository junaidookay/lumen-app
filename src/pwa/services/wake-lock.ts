import { hasCapability } from "./capabilities";

let wakeLockSentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<boolean> {
  if (!hasCapability("wakeLock")) return false;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLockSentinel?.release();
  } catch {
    // Already released
  }
  wakeLockSentinel = null;
}

export function isWakeLockSupported(): boolean {
  return hasCapability("wakeLock");
}
