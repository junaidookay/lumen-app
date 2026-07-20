/**
 * Episode parsing from torrent filenames — ported from CinefloTV.
 * Extracts S01E01 patterns from file paths to build episode metadata.
 */
import type { StreamEpisode } from "./types";

/**
 * Parse season/episode numbers from a file path.
 * Tries multiple regex patterns:
 *   - S01E01, s01e01
 *   - Season 1 Episode 1
 *   - 1x01
 * Returns null if no pattern matches.
 */
function parseSeFromPath(path: string): { season: number; episode: number } | null {
  const patterns = [
    /[Ss](\d{1,2})[Ee](\d{1,2})/,
    /Season\s*(\d{1,2}).*Episode\s*(\d{1,2})/i,
    /(\d{1,2})x(\d{1,2})/i,
  ];
  for (const re of patterns) {
    const m = path.match(re);
    if (m) return { season: parseInt(m[1]), episode: parseInt(m[2]) };
  }
  return null;
}

const VIDEO_RE = /\.(mp4|mkv|avi|mov|wmv|m4v|webm)$/i;

/**
 * Build TV episode metadata from RD torrent info.
 * Maps each video file to its season/episode and rd_link_index.
 */
export function buildTvEpisodesFromTorrentInfo(torrentInfo: {
  links?: string[];
  files?: Array<{ id: number; path: string; selected: number }>;
}): StreamEpisode[] {
  const linksCount = Array.isArray(torrentInfo?.links) ? torrentInfo.links.length : 0;
  const selectedFiles = (torrentInfo?.files || [])
    .filter((f) => f?.selected === 1)
    .sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));

  const episodes: StreamEpisode[] = [];
  let episodeCounter = 1;

  for (let i = 0; i < Math.min(selectedFiles.length, linksCount); i++) {
    const file = selectedFiles[i];
    const path = String(file?.path || "");
    if (!VIDEO_RE.test(path)) continue;

    const se = parseSeFromPath(path);
    const season = se ? se.season : 1;
    const episode = se ? se.episode : episodeCounter++;

    episodes.push({
      season,
      episode,
      title: path.split("/").pop()?.replace(/\.[^/.]+$/, "") || `Episode ${episode}`,
      rd_link_index: i,
    });
  }

  episodes.sort((a, b) => (a.season !== b.season ? a.season - b.season : a.episode - b.episode));
  return episodes;
}

/**
 * Find the link index for a specific episode by matching SxE patterns in torrent filenames.
 */
export function findEpisodeLinkIndex(
  torrentInfo: { files?: Array<{ id: number; path: string; selected: number }> },
  season: number,
  episode: number,
): number {
  if (!torrentInfo.files) return 0;
  const videoFiles = torrentInfo.files
    .filter((f) => f.selected === 1)
    .sort((a, b) => a.id - b.id);
  const sePattern = new RegExp(`[Ss]0?${season}[Ee]0?${episode}(?!\\d)`, "i");
  for (let i = 0; i < videoFiles.length; i++) {
    if (sePattern.test(videoFiles[i].path)) return i;
  }
  return 0;
}

/**
 * Find the first video file link index in a torrent.
 */
export function findFirstVideoLinkIndex(torrentInfo: {
  links?: string[];
  files?: Array<{ id: number; path: string; selected: number }>;
}): number {
  const linksCount = Array.isArray(torrentInfo?.links) ? torrentInfo.links.length : 0;
  if (linksCount === 0) return 0;
  const selectedFiles = (torrentInfo?.files || [])
    .filter((f) => f?.selected === 1)
    .sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
  for (let i = 0; i < Math.min(selectedFiles.length, linksCount); i++) {
    const path = String(selectedFiles[i]?.path || "");
    if (VIDEO_RE.test(path)) return i;
  }
  return 0;
}
