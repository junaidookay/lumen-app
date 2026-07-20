/**
 * Multi-source torrent search — ported from CinefloTV's instant-resolver.
 * Searches YTS, PirateBay, Torrents-CSV, EZTV directly + proxy-based sources.
 */
import type { TorrentResult } from "./types";

// ---- Helpers ----

function normalizeHash(hash: string): string {
  return hash.toLowerCase().replace(/[^a-f0-9]/g, "");
}

function extractHashFromMagnet(magnet: string): string {
  const match = magnet.match(/btih:([a-fA-F0-9]{40})/i);
  return match ? match[1].toLowerCase() : "";
}

function parseSize(sizeStr: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB|GiB|MiB)/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case "TB": return value * 1024 ** 4;
    case "GB": case "GIB": return value * 1024 ** 3;
    case "MB": case "MIB": return value * 1024 ** 2;
    case "KB": return value * 1024;
    default: return 0;
  }
}

function withTimeout<T>(fn: Promise<T>, ms: number): Promise<T> {
  return Promise.race([fn, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

// ---- Direct search sources ----

async function searchYTS(query: string): Promise<TorrentResult[]> {
  const encoded = encodeURIComponent(query);
  const data = await withTimeout(
    fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encoded}&limit=20&sort_by=seeds&order_by=desc`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.json()),
    12000,
  );
  if (!data?.data?.movies) return [];
  const results: TorrentResult[] = [];
  for (const movie of data.data.movies) {
    for (const t of movie.torrents || []) {
      if (!t.hash) continue;
      const hash = t.hash.toLowerCase();
      results.push({
        name: `${movie.title_long || movie.title} [${t.quality}] [${t.type || "web"}] - YTS`,
        info_hash: hash,
        magnet: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(movie.title)}&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.opentrackr.org:1337/announce`,
        seeders: parseInt(t.seeds) || 0,
        sizeBytes: parseInt(t.size_bytes) || 0,
        source: "yts",
      });
    }
  }
  return results;
}

async function searchPirateBay(query: string): Promise<TorrentResult[]> {
  const encoded = encodeURIComponent(query);
  const results = await withTimeout(
    fetch(`https://apibay.org/q.php?q=${encoded}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.json()),
    10000,
  );
  if (!Array.isArray(results)) return [];
  return results
    .filter((t: any) => t.info_hash !== "0000000000000000000000000000000000000000" && parseInt(t.seeders) > 0)
    .map((t: any) => ({
      name: t.name,
      info_hash: t.info_hash?.toLowerCase() || "",
      magnet: `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.name)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80`,
      seeders: parseInt(t.seeders) || 0,
      sizeBytes: parseInt(t.size) || 0,
      source: "piratebay",
    }));
}

async function searchTorrentsCSV(query: string): Promise<TorrentResult[]> {
  const encoded = encodeURIComponent(query);
  const data = await withTimeout(
    fetch(`https://torrents-csv.com/service/search?q=${encoded}&size=50`).then((r) => r.json()),
    10000,
  );
  const items = data.torrents || data;
  if (!Array.isArray(items)) return [];
  return items
    .map((t: any) => ({
      name: t.name || t.title || "",
      info_hash: (t.infohash || t.info_hash || "").toLowerCase(),
      magnet: `magnet:?xt=urn:btih:${t.infohash || t.info_hash}&dn=${encodeURIComponent(t.name || t.title || "")}&tr=udp://tracker.opentrackr.org:1337/announce`,
      seeders: t.seeders || t.seeds || 0,
      sizeBytes: t.size_bytes || parseInt(t.size) || 0,
      source: "torrents-csv",
    }))
    .filter((t: TorrentResult) => t.info_hash && t.info_hash.length >= 32);
}

async function searchEZTV(query: string): Promise<TorrentResult[]> {
  const data = await withTimeout(
    fetch("https://eztvx.to/api/get-torrents?limit=50&page=1&imdb_id=0", {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.json()),
    12000,
  );
  if (!data?.torrents) return [];
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w: string) => w.length > 2);
  return data.torrents
    .filter((t: any) => {
      const titleLower = (t.title || "").toLowerCase();
      return queryWords.some((w: string) => titleLower.includes(w)) && parseInt(t.seeds) > 0;
    })
    .map((t: any) => ({
      name: t.title || t.filename || "",
      info_hash: (t.hash || "").toLowerCase(),
      magnet: t.magnet_url || `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(t.title || "")}`,
      seeders: parseInt(t.seeds) || 0,
      sizeBytes: parseInt(t.size_bytes) || 0,
      source: "eztv",
    }))
    .filter((t: TorrentResult) => t.info_hash && t.info_hash.length >= 32);
}

// ---- Proxy-based sources ----

const API_PROXIES = [
  "https://torrent-api-py-jcpg.onrender.com",
  "https://torrent-api-py-two.vercel.app",
  "https://torrentapi-jntp.onrender.com",
  "https://torrent-api-py.onrender.com",
];

async function fetchWithFallback(path: string, timeout = 12000): Promise<any> {
  for (const base of API_PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(`${base}${path}`, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      clearTimeout(timer);
      if (!response.ok) { await response.text(); continue; }
      const data = await response.json();
      if (data?.data && data.data.length > 0) return data;
    } catch {
      // Try next proxy
    }
  }
  return null;
}

async function searchViaProxy(site: string, query: string, limit = 50): Promise<TorrentResult[]> {
  const encoded = encodeURIComponent(query);
  const data = await fetchWithFallback(`/api/v1/search?site=${site}&query=${encoded}&limit=${limit}`);
  if (!data?.data) return [];
  return data.data
    .map((item: any) => ({
      name: item.name || item.title || "",
      info_hash: (item.hash || extractHashFromMagnet(item.magnet) || "").toLowerCase(),
      magnet: item.magnet || "",
      seeders: parseInt(item.seeders) || 0,
      sizeBytes: parseSize(item.size),
      source: site,
    }))
    .filter((t: TorrentResult) => t.info_hash && t.info_hash.length >= 32);
}

// ---- Multi-source aggregator ----

export interface TorrentSearchOptions {
  query: string;
  type: "movie" | "tv";
  enabledSources?: string[];
  maxResults?: number;
}

const DEFAULT_SOURCES = ["yts", "piratebay", "torrents-csv", "eztv", "1337x", "torrentgalaxy", "bitsearch", "limetorrents"];
const PROXY_SOURCES = ["1337x", "torrentgalaxy", "torlock", "bitsearch", "limetorrents", "therarbg"];

export async function searchTorrents(options: TorrentSearchOptions): Promise<TorrentResult[]> {
  const { query, type, enabledSources = DEFAULT_SOURCES, maxResults = 100 } = options;
  const results: TorrentResult[] = [];
  const seenHashes = new Set<string>();
  const searchPromises: Promise<TorrentResult[]>[] = [];

  // Direct APIs
  if (type === "movie" && enabledSources.includes("yts")) {
    searchPromises.push(searchYTS(query).catch(() => []));
  }
  if (enabledSources.includes("piratebay")) {
    searchPromises.push(searchPirateBay(query).catch(() => []));
  }
  if (enabledSources.includes("torrents-csv")) {
    searchPromises.push(searchTorrentsCSV(query).catch(() => []));
  }
  if (type === "tv" && enabledSources.includes("eztv")) {
    searchPromises.push(searchEZTV(query).catch(() => []));
  }

  // Proxy-based sources
  for (const src of PROXY_SOURCES) {
    if (enabledSources.includes(src)) {
      const site = src === "limetorrents" ? "limetorrent" : src;
      searchPromises.push(searchViaProxy(site, query, 50).catch(() => []));
    }
  }

  const allResults = await Promise.all(searchPromises);
  for (const sourceResults of allResults) {
    for (const torrent of sourceResults) {
      const hash = normalizeHash(torrent.info_hash);
      if (!seenHashes.has(hash) && hash.length === 40) {
        seenHashes.add(hash);
        results.push({ ...torrent, info_hash: hash });
      }
    }
  }

  results.sort((a, b) => b.seeders - a.seeders);
  return results.slice(0, maxResults);
}

// ---- Torrent scoring ----

export function scoreTorrent(torrent: TorrentResult, preferSeasonPacks = true): number {
  let score = 0;
  const name = torrent.name.toLowerCase();
  score += Math.min(torrent.seeders, 1000) / 10;
  if (name.includes("2160p") || name.includes("4k")) score += 50;
  else if (name.includes("1080p")) score += 40;
  else if (name.includes("720p")) score += 20;
  if (name.includes("x265") || name.includes("hevc")) score += 15;
  if (name.includes("x264")) score += 10;
  if (name.includes("yify") || name.includes("yts")) score += 5;
  if (name.includes("rarbg")) score += 10;
  if (name.includes("sparks") || name.includes("geckos")) score += 8;
  if (preferSeasonPacks && (name.includes("season") || name.match(/s\d{2}(?!e)/i))) score += 25;
  const sizeGB = torrent.sizeBytes / (1024 ** 3);
  if (name.includes("1080p") && sizeGB < 0.5) score -= 50;
  if (name.includes("2160p") && sizeGB < 2) score -= 50;
  if (name.includes("cam") || name.includes("hdcam") || name.includes("telesync")) score -= 100;
  return score;
}

export function isTitleRelevant(torrentName: string, expectedTitle: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const normalizedTorrent = normalize(torrentName);
  const normalizedExpected = normalize(expectedTitle);
  const expectedWords = normalizedExpected.split(" ").filter((w) => w.length >= 3);
  if (expectedWords.length === 0) return true;
  const matchCount = expectedWords.filter((w) => normalizedTorrent.includes(w)).length;
  return matchCount / expectedWords.length >= 0.8;
}
