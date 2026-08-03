/**
 * Real Debrid API client — server-only.
 * All RD communication goes through here; the API key never touches the client.
 *
 * Critical notes:
 * - rdFetch reads as text first (RD sometimes returns empty 200 OK)
 * - unrestrictLink accepts clientIp (RD URLs are IP-locked)
 * - getTranscodedUrl uses /downloads list ID (unrestrict IDs don't work with /streaming/transcode)
 * - Transcode response uses `apple` not `hls`, quality keys nested under each format
 */
import type { RdTorrentInfo, RdUnrestrictedLink, RdUserInfo } from "./types";

const RD_API = "https://api.real-debrid.com/rest/1.0";

function getApiKey(): string {
  const key = process.env.REAL_DEBRID_API_KEY;
  if (!key) throw new Error("REAL_DEBRID_API_KEY is not configured");
  return key;
}

function rdHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

// ---- In-memory cache for unrestricted URLs ──────────────────────────
// RD unrestricted URLs are IP-locked and valid for hours. Cache them
// keyed by restricted link + client IP so replays are instant.

const unrestrictedCache = new Map<string, { id: string; download: string; at: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheKey(link: string, ip?: string): string {
  return `${link}:${ip ?? "unknown"}`;
}

function getCachedUnrestrict(link: string, ip?: string) {
  const key = cacheKey(link, ip);
  const entry = unrestrictedCache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry;
  unrestrictedCache.delete(key);
  return null;
}

function setCachedUnrestrict(link: string, ip: string | undefined, data: { id: string; download: string }) {
  const key = cacheKey(link, ip);
  if (unrestrictedCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of unrestrictedCache) {
      if (now - v.at > CACHE_TTL_MS) unrestrictedCache.delete(k);
    }
  }
  unrestrictedCache.set(key, { id: data.id, download: data.download, at: Date.now() });
}

// ---- Downloads list cache ───────────────────────────────────────────
// /downloads is called on every transcode attempt — cache for 5 min.

let downloadsCache: { data: any[]; at: number } | null = null;
const DOWNLOADS_CACHE_TTL_MS = 5 * 60 * 1000;

// ---- Safe fetch helper (handles empty bodies) ----

async function rdFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RD_API}${path}`, init);
  if (!res.ok) {
    let msg = `RD ${init?.method ?? "GET"} ${path} failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ---- User ----

export async function checkRdStatus(): Promise<RdUserInfo> {
  return rdFetch<RdUserInfo>("/user", {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
}

// ---- Torrents ----

export async function addMagnet(magnet: string): Promise<{ id: string }> {
  return rdFetch<{ id: string }>("/torrents/addMagnet", {
    method: "POST",
    headers: rdHeaders(),
    body: `magnet=${encodeURIComponent(magnet)}`,
  });
}

export async function selectFiles(torrentId: string, files = "all"): Promise<void> {
  await rdFetch(`/torrents/selectFiles/${torrentId}`, {
    method: "POST",
    headers: rdHeaders(),
    body: `files=${files}`,
  });
}

export async function getTorrentInfo(torrentId: string): Promise<RdTorrentInfo> {
  return rdFetch<RdTorrentInfo>(`/torrents/info/${torrentId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
}

/**
 * Unrestrict an RD short link. Pass clientIp so the resulting URL works
 * from the user's browser (RD download URLs are IP-locked).
 */
export async function unrestrictLink(
  link: string,
  clientIp?: string,
): Promise<RdUnrestrictedLink> {
  const cached = getCachedUnrestrict(link, clientIp);
  if (cached) {
    return { id: cached.id, download: cached.download, filename: "", mimeType: "", filesize: 0, link, host: "", chunks: 0, streamable: 1 };
  }
  const body = new URLSearchParams({ link });
  if (clientIp) body.set("ip", clientIp);
  const result = await rdFetch<RdUnrestrictedLink>("/unrestrict/link", {
    method: "POST",
    headers: rdHeaders(),
    body: body.toString(),
  });
  setCachedUnrestrict(link, clientIp, result);
  return result;
}

/**
 * Full magnet resolution flow: add magnet → select files → wait → get torrent info.
 */
export async function addMagnetAndWait(
  magnet: string,
  maxWaitMs = 30_000,
): Promise<RdTorrentInfo> {
  const { id } = await addMagnet(magnet);
  await selectFiles(id);

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 2000));
    const info = await getTorrentInfo(id);
    if (info.status === "downloaded") return info;
    if (info.status === "error" || info.status === "dead") {
      throw new Error(`Torrent failed: ${info.status}`);
    }
  }

  throw new Error("Torrent did not become ready in time");
}

// ---- Downloads list (needed for transcode ID lookup) ----

/**
 * Fetch the user's downloads list. The /streaming/transcode endpoint requires
 * the download ID from THIS list — the unrestrict/link ID does NOT work.
 */
export async function getDownloadsList(limit = 500): Promise<any[]> {
  if (downloadsCache && Date.now() - downloadsCache.at < DOWNLOADS_CACHE_TTL_MS) {
    return downloadsCache.data;
  }
  const data = await rdFetch<any[]>(`/downloads?limit=${limit}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  downloadsCache = { data, at: Date.now() };
  return data;
}

/**
 * Find the download ID that matches a given restricted link or download URL.
 * Returns the download ID string suitable for /streaming/transcode/{id}.
 */
export async function findDownloadId(restrictedLink: string): Promise<string | null> {
  const downloads = await getDownloadsList(500);
  // The restricted link looks like https://real-debrid.com/d/SHORTCODE
  const shortCode = restrictedLink.split("/d/")[1]?.split("?")[0]?.split("/")[0];
  if (!shortCode) return null;

  const match = downloads.find((d: any) => {
    // d.link is the restricted link URL — most reliable match
    const link = d.link || "";
    const dl = d.download || "";
    const generated = d.generated || "";
    return link.includes(shortCode) || dl.includes(shortCode) || generated.includes(shortCode);
  });
  return match?.id ?? null;
}

// ---- Transcoding ----

/**
 * Best-effort URL extraction from a transcode quality map.
 * The response shape is { "full": "https://...", "720": "https://...", ... }.
 * We prefer numeric keys sorted descending (highest quality first).
 */
function bestTranscodedUrl(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  const keys = Object.keys(obj)
    .filter((k) => {
      const v = obj[k];
      return typeof v === "string" && v.startsWith("http");
    })
    .sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return nb - na;
      if (a === "full") return -1;
      if (b === "full") return 1;
      return 0;
    });
  return keys.length > 0 ? obj[keys[0]] : null;
}

/**
 * Get a transcoded stream URL for the given download ID.
 *
 * IMPORTANT: The `id` parameter MUST be a download ID from /downloads?limit=500,
 * NOT the unrestrict/link ID. The /streaming/transcode endpoint returns
 * wrong_parameter error (code 2) with unrestrict IDs.
 *
 * Response shape:
 * {
 *   "apple":    { "full": "https://...full.m3u8" },
 *   "dash":     { "full": "https://...full.mpd" },
 *   "liveMP4":  { "full": "https://...full.mp4" },
 *   "h264WebM": { "full": "https://...full.webm" }
 * }
 *
 * Key name is `apple` NOT `hls`.
 */
export async function getTranscodedUrl(downloadId: string): Promise<string | null> {
  try {
    const data = await rdFetch<any>(`/streaming/transcode/${downloadId}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });
    if (!data) return null;

    // Priority: liveMP4 (browser-native) > apple/HLS > dash > h264WebM
    const candidates = [
      bestTranscodedUrl(data.liveMP4),
      bestTranscodedUrl(data.apple),
      bestTranscodedUrl(data.dash),
      bestTranscodedUrl(data.h264WebM),
    ].filter(Boolean) as string[];

    for (const url of candidates) {
      if (await isTranscodedPlayable(url)) return url;
    }
  } catch {
    // Transcode not available for this download — fall through
  }
  return null;
}

async function isTranscodedPlayable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json") || ct.includes("text/json")) return false;
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Instant availability ----

export async function checkInstantAvailability(
  hashes: string[],
): Promise<Record<string, { cached: boolean; files?: any[] }>> {
  if (hashes.length === 0) return {};
  const hashParam = hashes.join("/");
  try {
    return await rdFetch<Record<string, { cached: boolean; files?: any[] }>>(
      `/torrents/instantAvailability/${hashParam}`,
      { headers: { Authorization: `Bearer ${getApiKey()}` } },
    );
  } catch {
    return {};
  }
}
