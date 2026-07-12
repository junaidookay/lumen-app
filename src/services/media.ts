/**
 * Media data service. Thin abstraction over the current mock module so that
 * a future real API (TMDB, custom backend) can be swapped in without changing
 * component call sites. Every function is intentionally async-friendly — the
 * mock returns synchronously but is wrapped for symmetry with the eventual
 * network implementation.
 */
import { ALL_MEDIA, MOVIES, SHOWS, GENRES, COLLECTIONS, HOME_ROWS, HERO_ITEMS, searchMedia } from "@/mock/media";
import type { Episode, MediaItem, Season } from "@/types/media";

export const catalogue = {
  all: (): MediaItem[] => ALL_MEDIA,
  movies: (): MediaItem[] => MOVIES,
  shows: (): MediaItem[] => SHOWS,
  genres: () => GENRES,
  collections: () => COLLECTIONS,
  homeRows: () => HOME_ROWS,
  heroItems: () => HERO_ITEMS,
};

export function getMedia(id: string): MediaItem | undefined {
  return ALL_MEDIA.find((m) => m.id === id);
}
export function getMovie(id: string): MediaItem | undefined {
  const m = getMedia(id);
  return m?.kind === "movie" ? m : undefined;
}
export function getShow(id: string): MediaItem | undefined {
  const m = getMedia(id);
  return m?.kind === "tv" ? m : undefined;
}
export function getSeason(showId: string, seasonNumber: number): Season | undefined {
  return getShow(showId)?.seasons?.find((s) => s.seasonNumber === seasonNumber);
}
export function getEpisode(
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
): Episode | undefined {
  return getSeason(showId, seasonNumber)?.episodes.find((e) => e.episodeNumber === episodeNumber);
}

/** Adjacent episode (prev/next) across seasons. */
export function getAdjacentEpisode(
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
  dir: 1 | -1,
): Episode | undefined {
  const show = getShow(showId);
  if (!show?.seasons) return undefined;
  const flat = show.seasons.flatMap((s) => s.episodes);
  const idx = flat.findIndex((e) => e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber);
  if (idx < 0) return undefined;
  return flat[idx + dir];
}

export function getSimilar(id: string, limit = 12): MediaItem[] {
  const src = getMedia(id);
  if (!src) return [];
  return ALL_MEDIA
    .filter((m) => m.id !== id && m.kind === src.kind && m.genres.some((g) => src.genres.includes(g)))
    .slice(0, limit);
}

export function getRecommendations(id: string, limit = 12): MediaItem[] {
  const src = getMedia(id);
  if (!src) return [];
  return ALL_MEDIA
    .filter((m) => m.id !== id && m.rating >= 7.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getCollection(id: string) {
  return COLLECTIONS.find((c) => c.id === id);
}

export interface CatalogueFilters {
  kind?: "all" | "movie" | "tv";
  genres?: string[];
  minYear?: number;
  maxYear?: number;
  minRating?: number;
  sort?: "trending" | "newest" | "oldest" | "rating" | "title";
}

export function filterCatalogue(f: CatalogueFilters = {}): MediaItem[] {
  const kind = f.kind ?? "all";
  let list = kind === "all" ? ALL_MEDIA : ALL_MEDIA.filter((m) => m.kind === kind);
  if (f.genres?.length) list = list.filter((m) => f.genres!.every((g) => m.genres.includes(g)));
  if (f.minYear) list = list.filter((m) => new Date(m.releaseDate).getFullYear() >= f.minYear!);
  if (f.maxYear) list = list.filter((m) => new Date(m.releaseDate).getFullYear() <= f.maxYear!);
  if (f.minRating) list = list.filter((m) => m.rating >= f.minRating!);
  const sort = f.sort ?? "trending";
  const sorted = [...list].sort((a, b) => {
    switch (sort) {
      case "newest": return +new Date(b.releaseDate) - +new Date(a.releaseDate);
      case "oldest": return +new Date(a.releaseDate) - +new Date(b.releaseDate);
      case "rating": return b.rating - a.rating;
      case "title": return a.title.localeCompare(b.title);
      default: return b.rating * 0.6 + (+new Date(b.releaseDate) - +new Date(a.releaseDate)) * 1e-13 - (a.rating * 0.6);
    }
  });
  return sorted;
}

/** Advanced search with the same filter surface. */
export interface SearchFilters extends CatalogueFilters {
  q?: string;
}
export function search(f: SearchFilters): MediaItem[] {
  const base = f.q ? searchMedia(f.q) : ALL_MEDIA;
  // Reuse filterCatalogue's semantics on the pre-filtered set.
  const filtered = filterCatalogue({ ...f, kind: f.kind });
  const ids = new Set(base.map((m) => m.id));
  return filtered.filter((m) => ids.has(m.id));
}

export { searchMedia };