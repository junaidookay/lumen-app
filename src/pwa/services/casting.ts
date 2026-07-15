import { hasCapability } from "./capabilities";

export function isChromecastSupported(): boolean {
  return hasCapability("chromecast");
}

export function isAirPlaySupported(): boolean {
  return hasCapability("airplay");
}

export function isBackgroundPlaybackSupported(): boolean {
  return hasCapability("backgroundPlayback");
}

export async function requestBackgroundPlayback(): Promise<boolean> {
  if (!hasCapability("mediaSession")) return false;

  try {
    navigator.mediaSession.setActionHandler("play", () => {});
    navigator.mediaSession.setActionHandler("pause", () => {});
    navigator.mediaSession.setActionHandler("seekbackward", () => {});
    navigator.mediaSession.setActionHandler("seekforward", () => {});
    navigator.mediaSession.setActionHandler("previoustrack", () => {});
    navigator.mediaSession.setActionHandler("nexttrack", () => {});
    return true;
  } catch {
    return false;
  }
}

export function updateMediaSession(metadata: {
  title: string;
  artist?: string;
  artwork?: string;
}): void {
  if (!hasCapability("mediaSession")) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: metadata.title,
    artist: metadata.artist,
    artwork: metadata.artwork ? [{ src: metadata.artwork }] : undefined,
  });
}
