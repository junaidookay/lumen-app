import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveSources } from "./repository";
import type { PlaybackPreferences, StreamRequest, StreamResolution, StreamingSource } from "./types";

/**
 * Playback service — the seam between the UI and the streaming layer.
 * getPlaybackSources is a server function so providers (RD, embed) can access
 * Supabase service-role key safely.
 */
export const getPlaybackSources = createServerFn({ method: "GET" })
  .validator((d: { req: StreamRequest; prefs?: Partial<PlaybackPreferences> }) =>
    z.object({
      req: z.object({
        kind: z.enum(["movie", "tv"]),
        mediaId: z.string(),
        season: z.number().optional(),
        episode: z.number().optional(),
      }),
      prefs: z.record(z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    return resolveSources(data.req as StreamRequest, data.prefs as Partial<PlaybackPreferences>);
  });

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