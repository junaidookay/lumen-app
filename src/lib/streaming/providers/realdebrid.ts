/**
 * Real Debrid streaming provider — resolves content via RD torrents.
 *
 * Two-phase approach (ported from lumina-stream):
 * Phase 1 (Admin): resolveMagnetForContent stores pre-unrestricted URLs in rd_links JSONB
 * Phase 2 (Play): This provider reads rd_links directly — zero RD API calls at playback time.
 * Fallback: If no rd_links, calls resolveStream server fn for dynamic resolution.
 */
import type { StreamRequest, StreamingSource } from "../types";
import type { StreamingProvider } from "./registry";

interface RdLink {
  index: number;
  filename: string;
  download: string;
  filesize: number;
  mimeType: string;
  streamable: number;
  season?: number | null;
  episode?: number | null;
}

function inferContainer(filename: string, url: string): "mp4" | "hls" | "dash" | "webm" {
  const lower = (filename + " " + url).toLowerCase();
  if (lower.includes(".m3u8")) return "hls";
  if (lower.includes(".mpd")) return "dash";
  if (lower.includes(".webm")) return "webm";
  return "mp4";
}

function inferCodec(filename: string): "h264" | "h265" | "av1" | "unknown" {
  const lower = filename.toLowerCase();
  if (/(x264|h264|avc|bluray)/i.test(lower)) return "h264";
  if (/(x265|h265|hevc)/i.test(lower)) return "h265";
  if (/av1/i.test(lower)) return "av1";
  return "unknown";
}

export const realDebridProvider: StreamingProvider = {
  id: "realdebrid",
  name: "Real Debrid",
  list: async (req) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: content } = await supabaseAdmin
        .from("media_items")
        .select("id, kind, rd_torrent_id, rd_info_hash, rd_links, rd_selected_file, episodes, video_url, title")
        .eq("id", req.mediaId)
        .single();

      if (!content) return [];

      // Check for pre-resolved rd_links at title level
      let rdLinks = (content.rd_links as RdLink[] | null) ?? null;
      let selectedIdx = (content as any).rd_selected_file ?? 0;

      // For TV: check season-level rd_links first
      if (content.kind === "tv" && req.season != null) {
        const { data: seasonRow } = await (supabaseAdmin as any)
          .from("media_item_seasons")
          .select("rd_links, rd_selected_file, rd_torrent_id")
          .eq("media_item_id", req.mediaId)
          .eq("season_number", req.season)
          .single();

        if (seasonRow?.rd_links && Array.isArray(seasonRow.rd_links) && seasonRow.rd_links.length > 0) {
          rdLinks = seasonRow.rd_links;
          selectedIdx = seasonRow.rd_selected_file ?? 0;
        }
      }

      // PATH 1: Pre-resolved links exist — use them directly (fast, no API call)
      if (rdLinks && rdLinks.length > 0) {
        // For TV episodes, find the right link by season+episode match
        let link: RdLink | undefined;
        if (content.kind === "tv" && req.season != null && req.episode != null) {
          link = rdLinks.find(
            (l) => l.season === req.season && l.episode === req.episode,
          );
        }
        // Fallback to selected index or first link
        if (!link) {
          link = rdLinks[selectedIdx] ?? rdLinks[0];
        }

        if (link?.download) {
          const container = inferContainer(link.filename, link.download);
          const codec = inferCodec(link.filename);
          return [
            {
              id: `rd-${content.id}-${link.index}`,
              provider: "Real Debrid",
              providerId: "realdebrid",
              label: `${content.title} (RD)`,
              language: "en",
              container,
              codec,
              url: link.download,
              qualities: [{ id: "auto", label: "Auto" }],
              subtitles: [],
              audioTracks: [],
              default: true,
              health: "healthy",
            },
          ];
        }
      }

      // PATH 2: No pre-resolved links but has video_url (movie) — use it
      if (content.video_url && content.kind === "movie") {
        return [
          {
            id: `rd-${content.id}-url`,
            provider: "Real Debrid",
            providerId: "realdebrid",
            label: `${content.title} (RD)`,
            language: "en",
            container: inferContainer("", content.video_url),
            codec: "unknown",
            url: content.video_url,
            qualities: [{ id: "auto", label: "Auto" }],
            subtitles: [],
            audioTracks: [],
            default: true,
            health: "healthy",
          },
        ];
      }

      // PATH 3: No pre-resolved data — dynamic RD resolution via server fn
      // This is the fallback for content resolved before rd_links was added
      if (content.rd_torrent_id) {
        const { resolveStream } = await import("../../debrid/resolve-stream");
        const result = await resolveStream({
          data: {
            contentId: content.id,
            kind: (content.kind || req.kind) as "movie" | "tv",
            season: req.season,
            episode: req.episode,
            rdTorrentId: content.rd_torrent_id,
            rdInfoHash: content.rd_info_hash ?? undefined,
            episodes: (content.episodes as any[]) ?? undefined,
          },
        });

        if ("error" in result) {
          console.error("[rd-provider] Dynamic resolve failed:", result.error);
          return [];
        }

        const url = result.stream_url;
        let container: "mp4" | "hls" | "dash" | "webm" = "mp4";
        if (url.includes(".m3u8")) container = "hls";
        else if (url.includes(".mpd")) container = "dash";
        else if (url.includes(".webm")) container = "webm";

        return [
          {
            id: `rd-${content.id}-dynamic`,
            provider: "Real Debrid",
            providerId: "realdebrid",
            label: `${content.title} (RD)`,
            language: "en",
            container,
            codec: "unknown",
            url,
            qualities: [{ id: "auto", label: "Auto" }],
            subtitles: [],
            audioTracks: [],
            default: true,
            health: "healthy",
          },
        ];
      }

      return [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[rd-provider] Error:", msg);
      return [];
    }
  },
};
