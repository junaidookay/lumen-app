/**
 * Stream resolver — resolves content to playable URLs via Real Debrid.
 *
 * CRITICAL flow (all these are RD gotchas):
 * 1. Fetch torrent info from RD
 * 2. Find the correct link (by rd_link_index for TV, or first video for movies)
 * 3. Unrestrict the RD link WITH CLIENT IP (RD URLs are IP-locked)
 * 4. Get download ID from /downloads list (unrestrict ID doesn't work for transcode)
 * 5. Get transcoded stream from /streaming/transcode/{downloadId}
 * 6. Parse `apple` (not `hls`) for HLS, or `liveMP4` for progressive MP4
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  getTorrentInfo,
  unrestrictLink,
  getTranscodedUrl,
  findDownloadId,
} from "./real-debrid";
import { buildTvEpisodesFromTorrentInfo, findEpisodeLinkIndex, findFirstVideoLinkIndex } from "./episode-parser";
import type { StreamResolution, RdResolveError } from "./types";

// ---- Client IP extraction ----

function getClientIp(): string | undefined {
  try {
    const request = getRequest();
    const xfwd = request?.headers?.get("x-forwarded-for");
    if (xfwd) return xfwd.split(",")[0].trim();
    const realIp = request?.headers?.get("x-real-ip");
    if (realIp) return realIp;
    return undefined;
  } catch {
    return undefined;
  }
}

// ---- Internal helpers ----

async function readdTorrent(infoHash: string): Promise<{ torrentId?: string; error?: string }> {
  const { addMagnet, selectFiles } = await import("./real-debrid");
  try {
    const magnet = `magnet:?xt=urn:btih:${infoHash}`;
    const { id } = await addMagnet(magnet);
    await selectFiles(id);
    await new Promise((r) => setTimeout(r, 2000));
    return { torrentId: id };
  } catch (e) {
    return { error: String(e) };
  }
}

async function resolveFromTorrentInfo(
  torrentInfo: any,
  content: any,
  season: number | undefined,
  episode: number | undefined,
  clientIp?: string,
): Promise<{ stream_url?: string; error?: string; retryable?: boolean; episodes?: any[] }> {
  if (torrentInfo.status !== "downloaded") {
    return { error: `Torrent not ready (${torrentInfo.status})`, retryable: true };
  }
  if (!torrentInfo.links || torrentInfo.links.length === 0) {
    return { error: "No links available in torrent", retryable: false };
  }

  // Pick the right link index
  let linkIndex = 0;
  if (content.kind === "tv" && season !== undefined && episode !== undefined) {
    const episodes = Array.isArray(content.episodes) ? content.episodes : [];
    const targetEp = episodes.find((e: any) => e.season === season && e.episode === episode);
    if (targetEp?.rd_link_index !== undefined) {
      linkIndex = targetEp.rd_link_index;
    } else {
      linkIndex = findEpisodeLinkIndex(torrentInfo, season, episode);
    }
    if (linkIndex >= torrentInfo.links.length) linkIndex = 0;
  } else {
    linkIndex = findFirstVideoLinkIndex(torrentInfo);
  }

  // Unrestrict WITH CLIENT IP (RD URLs are IP-locked to the requester)
  const restrictedLink = torrentInfo.links[linkIndex];
  const unrestricted = await unrestrictLink(restrictedLink, clientIp);
  const directUrl = unrestricted.download;

  // Try transcoding for browser-compatible streams
  // IMPORTANT: The unrestrict ID does NOT work with /streaming/transcode.
  // We must look up the download ID from /downloads list instead.
  if (unrestricted.streamable === 1) {
    try {
      const downloadId = await findDownloadId(restrictedLink);
      if (downloadId) {
        const transcoded = await getTranscodedUrl(downloadId);
        if (transcoded) return { stream_url: transcoded };
      }
    } catch {
      // Transcode unavailable — fall back to direct URL
    }
  }

  return { stream_url: directUrl };
}

// ---- Server function: resolve stream for content ----

export const resolveStream = createServerFn({ method: "POST" })
  .validator((d: {
    contentId: string;
    kind: "movie" | "tv";
    season?: number;
    episode?: number;
    rdTorrentId?: string;
    rdInfoHash?: string;
    episodes?: any[];
    videoEmbedUrl?: string;
  }) =>
    z.object({
      contentId: z.string(),
      kind: z.enum(["movie", "tv"]),
      season: z.number().optional(),
      episode: z.number().optional(),
      rdTorrentId: z.string().optional(),
      rdInfoHash: z.string().optional(),
      episodes: z.array(z.any()).optional(),
      videoEmbedUrl: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<StreamResolution | RdResolveError> => {
    const { contentId, kind, season, episode, rdTorrentId, rdInfoHash, episodes, videoEmbedUrl } = data;

    // Get client IP for unrestrict (RD URLs are IP-locked)
    const clientIp = getClientIp();

    // No RD torrent — try stored URL or legacy
    if (!rdTorrentId) {
      if (kind === "tv" && season !== undefined && episode !== undefined && Array.isArray(episodes)) {
        const ep = episodes.find((e: any) => e.season === season && e.episode === episode);
        if (ep?.url) {
          return { stream_url: ep.url, source: "legacy" };
        }
      }
      if (videoEmbedUrl) {
        return { stream_url: videoEmbedUrl, source: "legacy" };
      }
      return { error: "No streaming source available", retryable: false };
    }

    // Dynamic RD resolution
    let torrentInfo: any;
    try {
      torrentInfo = await getTorrentInfo(rdTorrentId);
    } catch {
      // Torrent might have expired — try re-adding from hash
      if (rdInfoHash) {
        const readd = await readdTorrent(rdInfoHash);
        if (readd.error) return { error: readd.error, retryable: true };
        try {
          torrentInfo = await getTorrentInfo(readd.torrentId!);
        } catch {
          return { error: "Failed to retrieve torrent after re-add", retryable: true };
        }
      } else {
        return { error: "RD torrent not found and no hash to re-add", retryable: false };
      }
    }

    // Auto-build TV episodes if not already built
    let builtEpisodes: any[] | undefined;
    if (kind === "tv" && (!Array.isArray(episodes) || episodes.length === 0)) {
      builtEpisodes = buildTvEpisodesFromTorrentInfo(torrentInfo);
    }

    const result = await resolveFromTorrentInfo(
      torrentInfo,
      { kind, episodes: builtEpisodes || episodes },
      season,
      episode,
      clientIp,
    );

    if (result.error) return result as RdResolveError;
    return {
      stream_url: result.stream_url!,
      source: "rd_dynamic",
      episodes: builtEpisodes,
    };
  });

// ---- Server function: check RD account status ----

export const checkRdAccountStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { checkRdStatus } = await import("./real-debrid");
      const user = await checkRdStatus();
      return {
        configured: true,
        premium: user.premium > 0,
        expiration: user.expiration,
        username: user.username,
      };
    } catch (e) {
      return { configured: false, premium: false, expiration: null, username: null, error: String(e) };
    }
  });
