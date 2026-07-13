/**
 * Sample streaming provider.
 *
 * Serves publicly available test streams (Mux test-streams, Google sample
 * bucket) so the player has real HLS + MP4 content to demonstrate every
 * feature. Content does NOT match the actual title — this is a stand-in
 * for a real provider (Mux, JW, self-hosted, licensed CDN) that we plug
 * in later without changing the UI.
 */

import type { StreamingSource, StreamRequest } from "../types";
import type { StreamingProvider } from "./registry";

const HLS_MASTER = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const HLS_MASTER_ALT = "https://test-streams.mux.dev/pts_shift/master.m3u8";
const MP4_MASTER = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function hashKey(req: StreamRequest): number {
  const key = `${req.kind}:${req.mediaId}:${req.season ?? 0}:${req.episode ?? 0}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const sampleProvider: StreamingProvider = {
  id: "sample",
  name: "Sample",
  async list(req) {
    const seed = hashKey(req);
    const useAlt = seed % 3 === 0;
    const primaryUrl = useAlt ? HLS_MASTER_ALT : HLS_MASTER;
    const primary: StreamingSource = {
      id: `sample-hls-${seed}`,
      provider: "Sample",
      providerId: "sample",
      label: "Adaptive HLS · Multi-quality",
      language: "en",
      container: "hls",
      codec: "h264",
      url: primaryUrl,
      // Levels are populated at runtime by hls.js; we expose "Auto" plus
      // common ladder labels so the UI can render immediately.
      qualities: [
        { id: "auto", label: "Auto" },
        { id: "1080", label: "1080p", height: 1080 },
        { id: "720", label: "720p", height: 720 },
        { id: "480", label: "480p", height: 480 },
        { id: "360", label: "360p", height: 360 },
      ],
      subtitles: [],
      audioTracks: [],
      default: true,
      health: "healthy",
      capabilities: { hls: true },
    };
    const mirror: StreamingSource = {
      id: `sample-mp4-${seed}`,
      provider: "Sample",
      providerId: "sample",
      label: "Progressive MP4 · 720p",
      language: "en",
      container: "mp4",
      codec: "h264",
      url: MP4_MASTER,
      qualities: [{ id: "720", label: "720p", height: 720 }],
      subtitles: [
        {
          id: "en-mp4",
          language: "en",
          label: "English",
          url: "https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/basicapi.txt",
          default: true,
        },
      ].slice(0, 0), // no external subs by default
      audioTracks: [],
      health: "healthy",
      capabilities: { hls: false },
    };
    return [primary, mirror];
  },
};