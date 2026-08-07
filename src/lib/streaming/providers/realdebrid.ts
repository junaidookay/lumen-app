/**
 * Real Debrid streaming provider — resolves content via RD torrents.
 *
 * Three-path resolution:
 * PATH 1: Pre-resolved rd_links in DB (instant, no API call)
 * PATH 2: Dynamic resolution via getTorrentInfo + unrestrictLink (live RD API)
 * PATH 3: Stored video_url as last resort
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

function makeSource(content: any, url: string, filename = ""): StreamingSource {
  const container = inferContainer(filename, url);
  const codec = inferCodec(filename);
  return {
    id: `rd-${content.id}-${Date.now()}`,
    provider: "Real Debrid",
    providerId: "realdebrid",
    label: `${content.title} (RD)`,
    language: "en",
    container,
    codec,
    url,
    qualities: [{ id: "auto", label: "Auto" }],
    subtitles: [],
    audioTracks: [],
    default: true,
    health: "healthy",
  };
}

export const realDebridProvider: StreamingProvider = {
  id: "realdebrid",
  name: "Real Debrid",
  list: async (req) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Query content — if rd_links column doesn't exist yet, fall back
    let content: any = null;
    const result = await supabaseAdmin
      .from("media_items")
      .select("id, kind, rd_torrent_id, rd_info_hash, rd_links, rd_selected_file, episodes, video_url, title")
      .eq("id", req.mediaId)
      .single();
    if (result.error || !result.data) {
      // rd_links column may not exist — query without it
      const fallback = await supabaseAdmin
        .from("media_items")
        .select("id, kind, rd_torrent_id, rd_info_hash, episodes, video_url, title")
        .eq("id", req.mediaId)
        .single();
      content = fallback.data;
    } else {
      content = result.data;
    }

    if (!content) {
      console.error("[rd-provider] Content not found:", req.mediaId);
      return [];
    }

    // ---- PATH 1: Pre-resolved rd_links (instant) ----
    let rdLinks = (content.rd_links as RdLink[] | null) ?? null;
    let selectedIdx = (content as any).rd_selected_file ?? 0;

    // TV: check season-level rd_links first
    if (content.kind === "tv" && req.season != null) {
      const seasonResult = await (supabaseAdmin as any)
        .from("media_item_seasons")
        .select("rd_links, rd_selected_file")
        .eq("media_item_id", req.mediaId)
        .eq("season_number", req.season)
        .single();
      const seasonRow = seasonResult.data;
      if (seasonRow?.rd_links && Array.isArray(seasonRow.rd_links) && seasonRow.rd_links.length > 0) {
        rdLinks = seasonRow.rd_links;
        selectedIdx = seasonRow.rd_selected_file ?? 0;
      }
    }

    if (rdLinks && rdLinks.length > 0) {
      let link: RdLink | undefined;
      if (content.kind === "tv" && req.season != null && req.episode != null) {
        link = rdLinks.find((l) => l.season === req.season && l.episode === req.episode);
      }
      if (!link) link = rdLinks[selectedIdx] ?? rdLinks[0];
      if (link) {
        // Restricted links need unrestrict with client IP; pre-unrestricted links use .download
        const directUrl = (link as any).restrictedLink || link.download;
        if (directUrl) {
          // If it's a restricted link (RD /d/ URL), unrestrict with client IP
          if ((link as any).restrictedLink) {
            try {
              const { unrestrictLink } = await import("../../debrid/real-debrid");
              const unrestricted = await unrestrictLink((link as any).restrictedLink, req.clientIp);
              console.log("[rd-provider] Unrestricted stored link with client IP");
              return [makeSource(content, unrestricted.download, link.filename)];
            } catch (e) {
              console.error("[rd-provider] Failed to unrestrict stored link:", e instanceof Error ? e.message : e);
              // Fall through to dynamic resolution
            }
          } else {
            console.log("[rd-provider] Using pre-resolved rd_link");
            return [makeSource(content, directUrl, link.filename)];
          }
        }
      }
    }

    // ---- PATH 2: Dynamic resolution (live RD API call) ----
    if (content.rd_torrent_id) {
      console.log("[rd-provider] Dynamic resolution for torrent:", content.rd_torrent_id);
      const { getTorrentInfo, unrestrictLink, getTranscodedUrl, findDownloadId } = await import("../../debrid/real-debrid");
      const { findEpisodeLinkIndex, findFirstVideoLinkIndex } = await import("../../debrid/episode-parser");

      let torrentInfo: any;
      try {
        torrentInfo = await getTorrentInfo(content.rd_torrent_id);
        console.log("[rd-provider] Torrent status:", torrentInfo.status);
      } catch (e) {
        console.error("[rd-provider] getTorrentInfo failed:", e instanceof Error ? e.message : e);
        // Torrent expired — try re-adding from hash
        if (content.rd_info_hash) {
          const { addMagnet, selectFiles, waitForTorrent } = await import("../../debrid/real-debrid");
          const magnet = `magnet:?xt=urn:btih:${content.rd_info_hash}`;
          console.log("[rd-provider] Re-adding magnet from hash");
          const { id } = await addMagnet(magnet);
          await selectFiles(id);
          try {
            torrentInfo = await waitForTorrent(id);
          } catch (e) {
            console.error("[rd-provider] Re-added torrent not ready:", e instanceof Error ? e.message : e);
            return [];
          }
          console.log("[rd-provider] Re-added torrent status:", torrentInfo.status);
        } else {
          console.error("[rd-provider] No info hash to re-add");
          return [];
        }
      }

      if (torrentInfo.status !== "downloaded" || !torrentInfo.links?.length) {
        console.error("[rd-provider] Torrent not ready:", torrentInfo.status, "links:", torrentInfo.links?.length);
        return [];
      }

      // Pick the right link index
      let linkIndex = 0;
      if (content.kind === "tv" && req.season != null && req.episode != null) {
        const episodes = (content.episodes as any[]) ?? [];
        const targetEp = episodes.find((e: any) => e.season === req.season && e.episode === req.episode);
        if (targetEp?.rd_link_index !== undefined) {
          linkIndex = targetEp.rd_link_index;
        } else {
          linkIndex = findEpisodeLinkIndex(torrentInfo, req.season, req.episode);
        }
        if (linkIndex >= torrentInfo.links.length) linkIndex = 0;
      } else {
        linkIndex = findFirstVideoLinkIndex(torrentInfo);
      }

      // Use client IP passed from getPlaybackSources (where getRequest() works)
      const clientIp = req.clientIp;
      console.log("[rd-provider] Client IP:", clientIp ?? "none");

      const restrictedLink = torrentInfo.links[linkIndex];
      const unrestricted = await unrestrictLink(restrictedLink, clientIp);
      let streamUrl = unrestricted.download;
      const filename = torrentInfo.files?.[linkIndex]?.path ?? "";
      console.log("[rd-provider] Filename:", filename);
      console.log("[rd-provider] Streamable:", unrestricted.streamable);

      // H.264 MP4/M4V plays natively in browser — no transcoding needed
      const isH264Mp4 = /(\.mp4|\.m4v)$/i.test(filename) && /(x264|h264|avc|bluray)/i.test(filename);
      // Everything else (MKV, HEVC MP4, AVI, etc.) may need transcoding
      const needsTranscoding = !isH264Mp4;

      if (needsTranscoding && unrestricted.streamable === 1) {
        console.log("[rd-provider] File needs transcoding, attempting...");
        const downloadId = await findDownloadId(restrictedLink, unrestricted.id);
        console.log("[rd-provider] Download ID:", downloadId);
        if (downloadId) {
          const transcoded = await getTranscodedUrl(downloadId, req.clientIp);
          console.log("[rd-provider] Transcoded URL:", transcoded?.substring(0, 120) ?? "null");
          if (transcoded) streamUrl = transcoded;
        }
      } else {
        console.log("[rd-provider] Using direct URL (native playback)");
      }

      return [makeSource(content, streamUrl, filename)];
    }

    // ---- PATH 3: Stored video_url as last resort ----
    if (content.video_url) {
      console.log("[rd-provider] Using stored video_url");
      return [makeSource(content, content.video_url)];
    }

    console.error("[rd-provider] No RD data found for:", req.mediaId);
    return [];
  },
};
