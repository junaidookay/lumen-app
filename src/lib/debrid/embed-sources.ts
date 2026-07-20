/**
 * TMDB-based embed fallback sources — ported from CinefloTV's streamingSources.ts.
 * Used when no Real Debrid source is available.
 */

export interface EmbedSource {
  name: string;
  getEmbedUrl: (tmdbId: string, type: "movie" | "tv", season?: number, episode?: number) => string;
  priority: number;
}

export const EMBED_SOURCES: EmbedSource[] = [
  {
    name: "VidSrc",
    priority: 1,
    getEmbedUrl: (tmdbId, type, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
      }
      return `https://vidsrc.xyz/embed/${type}?tmdb=${tmdbId}`;
    },
  },
  {
    name: "VidSrc.to",
    priority: 2,
    getEmbedUrl: (tmdbId, type, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc.to/embed/${type}/${tmdbId}`;
    },
  },
  {
    name: "2Embed",
    priority: 3,
    getEmbedUrl: (tmdbId, type, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`;
      }
      return `https://www.2embed.cc/embed/${tmdbId}`;
    },
  },
  {
    name: "VidSrc.pro",
    priority: 4,
    getEmbedUrl: (tmdbId, type, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc.pro/embed/${type}/${tmdbId}`;
    },
  },
  {
    name: "SuperEmbed",
    priority: 5,
    getEmbedUrl: (tmdbId, type, season, episode) => {
      if (type === "tv" && season && episode) {
        return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;
      }
      return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
    },
  },
];

export function getEmbedUrl(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number): string {
  return EMBED_SOURCES[0].getEmbedUrl(tmdbId, type, season, episode);
}

export function getAllEmbedUrls(tmdbId: string, type: "movie" | "tv", season?: number, episode?: number): { name: string; url: string }[] {
  return EMBED_SOURCES.map((s) => ({
    name: s.name,
    url: s.getEmbedUrl(tmdbId, type, season, episode),
  }));
}
