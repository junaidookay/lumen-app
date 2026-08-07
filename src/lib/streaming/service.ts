import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { resolveSources } from "./repository";
import type { PlaybackPreferences, StreamRequest, StreamResolution, StreamingSource } from "./types";

/**
 * Playback service — the seam between the UI and the streaming layer.
 * getPlaybackSources is a server function so providers (RD) can access
 * Supabase service-role key and client IP safely.
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
    // Capture client IP here where getRequest() works reliably
    let clientIp: string | undefined;
    try {
      const request = getRequest();
      clientIp = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? request?.headers?.get("x-real-ip")
        ?? undefined;
    } catch {}

    const req = data.req as StreamRequest;
    req.clientIp = clientIp;

    return resolveSources(req, data.prefs as Partial<PlaybackPreferences>);
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
  preferredProvider: "realdebrid",
};
