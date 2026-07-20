/**
 * Real Debrid API client — server-only. Ported from CinefloTV's real-debrid Edge Function.
 * All RD communication goes through here; the API key never touches the client.
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

// ---- User ----

export async function checkRdStatus(): Promise<RdUserInfo> {
  const res = await fetch(`${RD_API}/user`, { headers: { Authorization: `Bearer ${getApiKey()}` } });
  if (!res.ok) throw new Error("Invalid Real Debrid API key");
  return res.json();
}

// ---- Torrents ----

export async function addMagnet(magnet: string): Promise<{ id: string }> {
  const res = await fetch(`${RD_API}/torrents/addMagnet`, {
    method: "POST",
    headers: rdHeaders(),
    body: `magnet=${encodeURIComponent(magnet)}`,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "Failed to add magnet");
  }
  return res.json();
}

export async function selectFiles(torrentId: string, files = "all"): Promise<void> {
  const res = await fetch(`${RD_API}/torrents/selectFiles/${torrentId}`, {
    method: "POST",
    headers: rdHeaders(),
    body: `files=${files}`,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "Failed to select files");
  }
}

export async function getTorrentInfo(torrentId: string): Promise<RdTorrentInfo> {
  const res = await fetch(`${RD_API}/torrents/info/${torrentId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) throw new Error(`Failed to get torrent info (${res.status})`);
  return res.json();
}

export async function unrestrictLink(link: string): Promise<RdUnrestrictedLink> {
  const res = await fetch(`${RD_API}/unrestrict/link`, {
    method: "POST",
    headers: rdHeaders(),
    body: `link=${encodeURIComponent(link)}`,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Unrestrict failed (${res.status})`);
  }
  return res.json();
}

/**
 * Full magnet resolution flow: add magnet → select files → wait → get torrent info.
 * Returns the torrent info when ready, or throws if it fails.
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

// ---- Transcoding ----

function extractCandidateUrls(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  const preferredKeys = ["full", "hd", "sd", "720p", "1080p", "360p"];
  const urls: string[] = [];
  for (const k of preferredKeys) {
    const v = obj[k];
    if (typeof v === "string") urls.push(v);
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string") urls.push(v);
  }
  return [...new Set(urls)];
}

export async function getTranscodedUrl(id: string): Promise<string | null> {
  const tryIds = [id];
  if (id.length > 2 && /\d{2}$/.test(id)) tryIds.push(id.slice(0, -2));

  for (const candidateId of tryIds) {
    const res = await fetch(`${RD_API}/streaming/transcode/${candidateId}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });
    if (!res.ok) continue;
    const data = (await res.json().catch(() => null)) as any;
    if (!data) continue;

    const candidates = [
      ...extractCandidateUrls(data.liveMP4),
      ...extractCandidateUrls(data.apple),
      ...extractCandidateUrls(data.hls),
    ];

    for (const url of candidates) {
      if (await isTranscodedPlayable(url)) return url;
    }
  }

  return null;
}

async function isTranscodedPlayable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1" } });
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
  const res = await fetch(`${RD_API}/torrents/instantAvailability/${hashParam}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("RD rate limited");
    return {};
  }
  return res.json();
}
