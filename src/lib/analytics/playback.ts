/**
 * Playback analytics — structured event emitter.
 * Fans out to console + subscribed sinks. Wire a Supabase table, PostHog,
 * or Segment later without touching the player.
 */

export type PlaybackEventName =
  | "playback.started"
  | "playback.paused"
  | "playback.resumed"
  | "playback.seek"
  | "playback.buffering"
  | "playback.error"
  | "playback.quality-changed"
  | "playback.audio-changed"
  | "playback.subtitle-changed"
  | "playback.source-changed"
  | "playback.completed";

export interface PlaybackEvent {
  name: PlaybackEventName;
  mediaId: string;
  mediaKind: "movie" | "tv";
  season?: number;
  episode?: number;
  sourceId?: string;
  provider?: string;
  positionSeconds?: number;
  durationSeconds?: number;
  percent?: number;
  meta?: Record<string, unknown>;
  timestamp: string;
}

type Sink = (event: PlaybackEvent) => void;
const sinks: Sink[] = [];

export function subscribe(sink: Sink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

export function track(event: Omit<PlaybackEvent, "timestamp">): void {
  const full: PlaybackEvent = { ...event, timestamp: new Date().toISOString() };
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[playback]", full.name, full);
  }
  for (const s of sinks) {
    try { s(full); } catch { /* analytics must never break playback */ }
  }
}