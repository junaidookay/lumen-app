const STORAGE_KEY = "watchbox-playback-state";

interface PlaybackState {
  mediaId: string;
  mediaKind: "movie" | "tv";
  season?: number;
  episode?: number;
  positionSeconds: number;
  durationSeconds: number;
  timestamp: number;
}

export function savePlaybackState(state: Omit<PlaybackState, "timestamp">): void {
  try {
    const full: PlaybackState = { ...state, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // localStorage unavailable
  }
}

export function getPlaybackState(): PlaybackState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaybackState;
    if (Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlaybackState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}
