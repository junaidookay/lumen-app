/**
 * Real Debrid streaming provider — resolves content via RD torrents.
 * Registered in the provider registry alongside other providers.
 */
import type { StreamRequest, StreamingSource } from "../types";
import type { StreamingProvider } from "./registry";
import { resolveStream } from "../../debrid/resolve-stream";

export interface RdProviderResult {
  sources: StreamingSource[];
  error?: string;
}

async function resolveRdSources(req: StreamRequest): Promise<RdProviderResult> {
  try {
    // Fetch content metadata from Supabase
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: content } = await supabaseAdmin
      .from("media_items")
      .select("id, kind, rd_torrent_id, rd_info_hash, episodes, video_url, title")
      .eq("id", req.mediaId)
      .single();

    if (!content) return { sources: [], error: "Content not found in database" };

    // Check season-level RD data first (for per-season magnets)
    let rdTorrentId = content.rd_torrent_id;
    let rdInfoHash = content.rd_info_hash;
    let episodes = (content.episodes as any[]) ?? undefined;

    if (content.kind === "tv" && req.season != null) {
      const { data: seasonRow } = await (supabaseAdmin as any)
        .from("media_item_seasons")
        .select("rd_torrent_id, rd_info_hash, episodes")
        .eq("media_item_id", req.mediaId)
        .eq("season_number", req.season)
        .single();

      if (seasonRow?.rd_torrent_id) {
        rdTorrentId = seasonRow.rd_torrent_id;
        rdInfoHash = seasonRow.rd_info_hash;
        episodes = seasonRow.episodes ?? [];
      }
    }

    // If no RD torrent and no stored URL, return empty
    if (!rdTorrentId && !content.video_url) {
      return { sources: [], error: "No Real Debrid magnet attached. Add one from the admin dashboard." };
    }

    // Resolve via RD
    const result = await resolveStream({
      data: {
        contentId: content.id,
        kind: (content.kind || req.kind) as "movie" | "tv",
        season: req.season,
        episode: req.episode,
        rdTorrentId: rdTorrentId ?? undefined,
        rdInfoHash: rdInfoHash ?? undefined,
        episodes,
        videoEmbedUrl: content.video_url ?? undefined,
      },
    });

    if ("error" in result) {
      return { sources: [], error: result.error };
    }

    // Determine container from URL
    const url = result.stream_url;
    let container: "mp4" | "webm" | "hls" | "dash" = "mp4";
    if (url.includes(".m3u8")) container = "hls";
    else if (url.includes(".mpd")) container = "dash";
    else if (url.includes(".webm")) container = "webm";

    return {
      sources: [
        {
          id: `rd-${content.id}`,
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
      ],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rd-provider] Error:", msg);
    return { sources: [], error: `RD error: ${msg}` };
  }
}

export const realDebridProvider: StreamingProvider = {
  id: "realdebrid",
  name: "Real Debrid",
  list: async (req) => {
    const result = await resolveRdSources(req);
    // Attach error to sources for propagation
    if (result.error && result.sources.length === 0) {
      // Store error as a marker — repository will pick it up
      (result as any)._error = result.error;
    }
    return result.sources;
  },
};
