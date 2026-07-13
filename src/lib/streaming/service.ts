import { resolveSources } from "./repository";
import type { PlaybackPreferences, StreamRequest, StreamResolution, StreamingSource } from "./types";

/**
 * Playback service — the seam between the UI and the streaming layer.
 * The Watch page and VideoPlayer only import from here.
 */
export async function getPlaybackSources(
  req: StreamRequest,
  prefs?: Partial<PlaybackPreferences>,
): Promise<StreamResolution> {
  return resolveSources(req, prefs);
}

/** Pick the next source when the current one fails. */
export function pickFallback(
  sources: StreamingSource[],
  tried: string[],
): StreamingSource | null {
  return sources.find((s) => !tried.includes(s.id)) ?? null;
}

export const DEFAULT_PREFS: PlaybackPreferences = {
  audioLanguage: "en",
  subtitleLanguage: "en",
  subtitlesEnabled: true,
  quality: "auto",
  playbackSpeed: 1,
  preferredProvider: "sample",
};