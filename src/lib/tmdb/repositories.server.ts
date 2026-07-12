/**
 * Repository layer: thin, typed wrappers around individual TMDB endpoints.
 * Server-only. Consumed by content services / server functions.
 */
import { tmdbFetch } from "./client.server";
import type {
  TMDBCollectionDetail,
  TMDBEpisodeDetail,
  TMDBGenre,
  TMDBListItem,
  TMDBMovieDetail,
  TMDBMovieListItem,
  TMDBMultiSearchItem,
  TMDBPaginated,
  TMDBSeasonDetail,
  TMDBTVDetail,
  TMDBTVListItem,
} from "./types";

// ---------------- Trending & lists ----------------

export function trending(
  mediaType: "all" | "movie" | "tv" = "all",
  window: "day" | "week" = "week",
  page = 1,
) {
  return tmdbFetch<TMDBPaginated<TMDBListItem>>(`/trending/${mediaType}/${window}`, { query: { page } });
}

export const popularMovies = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>("/movie/popular", { query: { page } });
export const topRatedMovies = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>("/movie/top_rated", { query: { page } });
export const upcomingMovies = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>("/movie/upcoming", { query: { page } });
export const nowPlayingMovies = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>("/movie/now_playing", { query: { page } });

export const popularTV = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>("/tv/popular", { query: { page } });
export const topRatedTV = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>("/tv/top_rated", { query: { page } });
export const airingTodayTV = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>("/tv/airing_today", { query: { page } });
export const onTheAirTV = (page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>("/tv/on_the_air", { query: { page } });

// ---------------- Details ----------------

const MOVIE_APPEND = "credits,videos,images,recommendations,similar,reviews,release_dates";
const TV_APPEND = "credits,videos,images,recommendations,similar,reviews,content_ratings";

export function movieDetail(id: string | number) {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${id}`, {
    query: { append_to_response: MOVIE_APPEND, include_image_language: "en,null" },
  });
}

export function tvDetail(id: string | number) {
  return tmdbFetch<TMDBTVDetail>(`/tv/${id}`, {
    query: { append_to_response: TV_APPEND, include_image_language: "en,null" },
  });
}

export function seasonDetail(tvId: string | number, seasonNumber: number) {
  return tmdbFetch<TMDBSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

export function episodeDetail(tvId: string | number, seasonNumber: number, episodeNumber: number) {
  return tmdbFetch<TMDBEpisodeDetail>(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`, {
    query: { append_to_response: "credits,images,videos" },
  });
}

export function collectionDetail(id: string | number) {
  return tmdbFetch<TMDBCollectionDetail>(`/collection/${id}`);
}

// ---------------- Recommendations & similar ----------------

export const movieRecommendations = (id: string | number, page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>(`/movie/${id}/recommendations`, { query: { page } });
export const tvRecommendations = (id: string | number, page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>(`/tv/${id}/recommendations`, { query: { page } });
export const movieSimilar = (id: string | number, page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>(`/movie/${id}/similar`, { query: { page } });
export const tvSimilar = (id: string | number, page = 1) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>(`/tv/${id}/similar`, { query: { page } });

// ---------------- Genres ----------------

export const movieGenres = () => tmdbFetch<{ genres: TMDBGenre[] }>("/genre/movie/list");
export const tvGenres = () => tmdbFetch<{ genres: TMDBGenre[] }>("/genre/tv/list");

// ---------------- Search ----------------

export interface SearchQuery {
  query: string;
  page?: number;
  include_adult?: boolean;
}
export const searchMulti = ({ query, page = 1, include_adult = false }: SearchQuery) =>
  tmdbFetch<TMDBPaginated<TMDBMultiSearchItem>>("/search/multi", {
    query: { query, page, include_adult },
  });
export const searchMovie = ({ query, page = 1, include_adult = false }: SearchQuery) =>
  tmdbFetch<TMDBPaginated<TMDBMovieListItem>>("/search/movie", { query: { query, page, include_adult } });
export const searchTV = ({ query, page = 1, include_adult = false }: SearchQuery) =>
  tmdbFetch<TMDBPaginated<TMDBTVListItem>>("/search/tv", { query: { query, page, include_adult } });

// ---------------- Discover ----------------

export interface DiscoverParams {
  kind: "movie" | "tv";
  page?: number;
  sort_by?: string;
  with_genres?: string;
  primary_release_year?: number;
  first_air_date_year?: number;
  "vote_average.gte"?: number;
  "primary_release_date.gte"?: string;
  "primary_release_date.lte"?: string;
  "first_air_date.gte"?: string;
  "first_air_date.lte"?: string;
  include_adult?: boolean;
}

export function discover({ kind, ...q }: DiscoverParams) {
  return tmdbFetch<TMDBPaginated<TMDBListItem>>(`/discover/${kind}`, { query: q });
}