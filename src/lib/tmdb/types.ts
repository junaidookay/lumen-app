/**
 * Minimal TMDB API response types.
 * We only declare fields we actually consume in mappers.
 */

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  order?: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
}

export interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average?: number;
}

export interface TMDBImages {
  backdrops: TMDBImage[];
  posters: TMDBImage[];
  logos: TMDBImage[];
  stills?: TMDBImage[];
}

export interface TMDBReview {
  id: string;
  author: string;
  author_details?: {
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
}

export interface TMDBSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  origin_country: string;
  logo_path: string | null;
}

export interface TMDBCollectionRef {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBBase {
  id: number;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  popularity: number;
  genre_ids?: number[];
  genres?: TMDBGenre[];
}

export interface TMDBMovieListItem extends TMDBBase {
  title: string;
  original_title: string;
  release_date: string;
}

export interface TMDBTVListItem extends TMDBBase {
  name: string;
  original_name: string;
  first_air_date: string;
}

export type TMDBListItem = TMDBMovieListItem | TMDBTVListItem;

export interface TMDBMovieDetail extends TMDBMovieListItem {
  tagline: string;
  runtime: number | null;
  status: string;
  budget: number;
  revenue: number;
  original_language: string;
  spoken_languages: TMDBSpokenLanguage[];
  production_companies: TMDBProductionCompany[];
  belongs_to_collection: TMDBCollectionRef | null;
  credits?: TMDBCredits;
  videos?: { results: TMDBVideo[] };
  images?: TMDBImages;
  reviews?: { results: TMDBReview[] };
  recommendations?: { results: TMDBMovieListItem[] };
  similar?: { results: TMDBMovieListItem[] };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
}

export interface TMDBEpisodeSummary {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_number: number;
  air_date: string;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
}

export interface TMDBSeasonSummary {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string;
  episode_count: number;
  poster_path: string | null;
}

export interface TMDBTVDetail extends TMDBTVListItem {
  tagline: string;
  status: string;
  original_language: string;
  spoken_languages: TMDBSpokenLanguage[];
  production_companies: TMDBProductionCompany[];
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  networks: { id: number; name: string; logo_path: string | null }[];
  last_air_date: string | null;
  seasons: TMDBSeasonSummary[];
  credits?: TMDBCredits;
  videos?: { results: TMDBVideo[] };
  images?: TMDBImages;
  reviews?: { results: TMDBReview[] };
  recommendations?: { results: TMDBTVListItem[] };
  similar?: { results: TMDBTVListItem[] };
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
}

export interface TMDBSeasonDetail extends TMDBSeasonSummary {
  episodes: TMDBEpisodeSummary[];
}

export interface TMDBEpisodeDetail extends TMDBEpisodeSummary {
  credits?: TMDBCredits;
  images?: { stills: TMDBImage[] };
  videos?: { results: TMDBVideo[] };
}

export interface TMDBPersonListItem {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  known_for?: Array<TMDBListItem & { media_type: "movie" | "tv" }>;
}

export interface TMDBMultiSearchItem {
  media_type: "movie" | "tv" | "person";
  id: number;
  name?: string;
  title?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  profile_path?: string | null;
  overview?: string;
  vote_average?: number;
  popularity?: number;
  known_for_department?: string;
  genre_ids?: number[];
  known_for?: unknown[];
}

export interface TMDBPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBCollectionDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TMDBMovieListItem[];
}