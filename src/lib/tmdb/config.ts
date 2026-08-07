/**
 * TMDB configuration constants and image helpers.
 * Client-safe: no secrets, no fetch. Import freely from components.
 */

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export const POSTER_SIZES = ["w92", "w154", "w185", "w342", "w500", "w780", "original"] as const;
export const BACKDROP_SIZES = ["w300", "w780", "w1280", "original"] as const;
export const STILL_SIZES = ["w92", "w185", "w300", "original"] as const;
export const PROFILE_SIZES = ["w45", "w185", "h632", "original"] as const;
export const LOGO_SIZES = ["w45", "w92", "w154", "w185", "w300", "w500", "original"] as const;

export type PosterSize = (typeof POSTER_SIZES)[number];
export type BackdropSize = (typeof BACKDROP_SIZES)[number];
export type StillSize = (typeof STILL_SIZES)[number];
export type ProfileSize = (typeof PROFILE_SIZES)[number];
export type LogoSize = (typeof LOGO_SIZES)[number];

/** Build a TMDB image URL. Proxied through our API to avoid CORS. Returns empty string when path is missing. */
export function tmdbImage(path: string | null | undefined, size: string = "original"): string {
  if (!path) return "";
  return `/api/image?path=/${size}${path}`;
}

export const poster = (p?: string | null, size: PosterSize = "w500") => tmdbImage(p, size);
export const backdrop = (p?: string | null, size: BackdropSize = "w1280") => tmdbImage(p, size);
export const still = (p?: string | null, size: StillSize = "w300") => tmdbImage(p, size);
export const profile = (p?: string | null, size: ProfileSize = "w185") => tmdbImage(p, size);
export const logo = (p?: string | null, size: LogoSize = "w300") => tmdbImage(p, size);