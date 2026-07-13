/**
 * Streaming domain types.
 *
 * The UI never sees provider-specific shapes — everything flows through
 * `StreamingSource`, `SubtitleTrack`, `AudioTrack`, `QualityLevel` so we can
 * swap providers (Mux, JW, Bitmovin, self-hosted, DRM'd HLS) without touching
 * the player.
 */

import type { MediaKind } from "@/types/media";

export type StreamContainer = "hls" | "dash" | "mp4" | "webm";
export type StreamCodec = "h264" | "h265" | "av1" | "vp9" | "unknown";
export type SourceHealth = "healthy" | "degraded" | "offline" | "unknown";

export interface SubtitleTrack {
  id: string;
  /** BCP-47-ish, e.g. "en", "en-US", "ja". */
  language: string;
  label: string;
  /** Absolute WebVTT URL. Omitted when subs are embedded in the manifest. */
  url?: string;
  default?: boolean;
  forced?: boolean;
}

export interface AudioTrack {
  id: string;
  language: string;
  label: string;
  channels?: string; // e.g. "2.0", "5.1"
  default?: boolean;
}

export interface QualityLevel {
  /** Provider-native id; "auto" is reserved. */
  id: string;
  label: string; // "1080p", "720p", "Auto"
  height?: number;
  bitrate?: number;
}

export interface StreamingSource {
  id: string;
  /** Human name of the provider (Sample, Mux, JW, …). */
  provider: string;
  /** Provider-registered adapter id (`sample`, `mux`, …). */
  providerId: string;
  label: string;
  language: string;
  container: StreamContainer;
  codec: StreamCodec;
  /** Playable URL — HLS/DASH manifest or progressive MP4/WebM. */
  url: string;
  qualities: QualityLevel[];
  subtitles: SubtitleTrack[];
  audioTracks: AudioTrack[];
  default?: boolean;
  health: SourceHealth;
  /** DRM/AES-128, chromecast-ready, etc. Reserved for future milestones. */
  capabilities?: Record<string, boolean>;
}

export interface StreamRequest {
  kind: MediaKind;
  mediaId: string;
  season?: number;
  episode?: number;
}

export interface StreamResolution {
  sources: StreamingSource[];
  /** The source the service recommends (respects user preference & default flag). */
  preferred: StreamingSource | null;
  /** All providers that were queried, useful for diagnostics. */
  providers: string[];
}

export interface PlaybackPreferences {
  audioLanguage: string;
  subtitleLanguage: string;
  subtitlesEnabled: boolean;
  quality: string; // "auto" | "1080p" | …
  playbackSpeed: number;
  preferredProvider: string;
  preferredSourceId?: string;
}