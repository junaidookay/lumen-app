/**
 * Shared media types.
 * Designed so a future TMDB (or any) API adapter can hydrate the same shape.
 */

export type MediaKind = "movie" | "tv";

export type AgeRating = "G" | "PG" | "PG-13" | "R" | "NC-17" | "TV-Y" | "TV-PG" | "TV-14" | "TV-MA";
export type MediaStatus = "Released" | "Returning Series" | "Ended" | "In Production" | "Post Production";
export type Language = "English" | "Japanese" | "Korean" | "Spanish" | "French" | "German" | "Italian";

export interface CastMember {
  id: string;
  name: string;
  character?: string;
  photo?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  department?: string;
  photo?: string;
}

export interface ProductionCompany {
  id: string;
  name: string;
  country?: string;
}

export interface Trailer {
  id: string;
  title: string;
  thumbnail: string;
  /** Placeholder embed URL (mock) */
  url: string;
  duration: number;
}

export interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  createdAt: string;
  content: string;
}

export interface Episode {
  id: string;
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  runtime: number;
  airDate: string;
  still: string;
  rating: number;
  /** 0-1 progress for continue watching (mock) */
  progress?: number;
}

export interface Season {
  id: string;
  showId: string;
  seasonNumber: number;
  name: string;
  overview: string;
  poster: string;
  airDate: string;
  episodes: Episode[];
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  /** Portrait poster, ~2:3 */
  poster: string;
  /** Landscape backdrop, ~16:9 */
  backdrop: string;
  overview: string;
  genres: string[];
  /** Minutes for a movie, average episode length for TV */
  runtime: number;
  /** ISO date */
  releaseDate: string;
  /** 0–10 */
  rating: number;
  cast: CastMember[];
  /** Optional metadata for hero variants */
  tagline?: string;
  logo?: string;
  ageRating?: AgeRating;
  status?: MediaStatus;
  originalLanguage?: Language;
  spokenLanguages?: Language[];
  budget?: number;
  revenue?: number;
  director?: string;
  writers?: string[];
  crew?: CrewMember[];
  productionCompanies?: ProductionCompany[];
  gallery?: string[];
  trailers?: Trailer[];
  reviews?: Review[];
  qualities?: string[];
  collectionId?: string;
  // TV-specific
  network?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: Season[];
}

export interface Collection {
  id: string;
  title: string;
  subtitle?: string;
  cover: string;
  itemIds: string[];
}

export interface Genre {
  id: string;
  name: string;
  /** Gradient CSS used on genre tiles */
  gradient: string;
  icon?: string;
}

/** A section of media items on a home/discover page. */
export interface MediaRow {
  id: string;
  title: string;
  subtitle?: string;
  items: MediaItem[];
}