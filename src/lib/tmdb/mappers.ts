/**
 * Pure mappers from TMDB response shapes to our internal MediaItem model.
 * Client-safe — no fetch, no secrets.
 */
import type {
  AgeRating,
  CastMember,
  Collection,
  CrewMember,
  Episode,
  Language,
  MediaItem,
  MediaStatus,
  ProductionCompany,
  Review,
  Season,
  Trailer,
} from "@/types/media";
import { backdrop, logo, poster, profile, still } from "./config";
import type {
  TMDBCollectionDetail,
  TMDBCredits,
  TMDBEpisodeDetail,
  TMDBEpisodeSummary,
  TMDBImage,
  TMDBImages,
  TMDBListItem,
  TMDBMovieDetail,
  TMDBMovieListItem,
  TMDBMultiSearchItem,
  TMDBReview,
  TMDBSeasonDetail,
  TMDBTVDetail,
  TMDBTVListItem,
  TMDBVideo,
} from "./types";

const YT = "https://www.youtube.com/embed/";

function language(l?: string): Language | undefined {
  const m: Record<string, Language> = {
    en: "English", ja: "Japanese", ko: "Korean", es: "Spanish",
    fr: "French", de: "German", it: "Italian",
  };
  return l ? m[l] : undefined;
}

function status(s?: string): MediaStatus | undefined {
  if (!s) return undefined;
  const allowed: MediaStatus[] = ["Released", "Returning Series", "Ended", "In Production", "Post Production"];
  return (allowed.includes(s as MediaStatus) ? s : undefined) as MediaStatus | undefined;
}

function ageRating(c?: string): AgeRating | undefined {
  if (!c) return undefined;
  const allowed: AgeRating[] = ["G", "PG", "PG-13", "R", "NC-17", "TV-Y", "TV-PG", "TV-14", "TV-MA"];
  return allowed.includes(c as AgeRating) ? (c as AgeRating) : undefined;
}

function pickTrailer(videos?: { results: TMDBVideo[] }): Trailer[] {
  const results = videos?.results ?? [];
  const youtube = results.filter((v) => v.site === "YouTube");
  const ranked = [...youtube].sort((a, b) => {
    const order = (v: TMDBVideo) =>
      (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 1 : v.type === "Featurette" ? 2 : 3) +
      (v.official ? 0 : 0.5);
    return order(a) - order(b);
  });
  return ranked.slice(0, 6).map((v) => ({
    id: v.id,
    title: v.name || v.type,
    thumbnail: `https://img.youtube.com/vi/${v.key}/hqdefault.jpg`,
    url: `${YT}${v.key}`,
    duration: 120,
  }));
}

function mapCredits(credits?: TMDBCredits): { cast: CastMember[]; crew: CrewMember[]; director?: string; writers?: string[] } {
  const cast = (credits?.cast ?? [])
    .slice(0, 20)
    .map((c) => ({ id: String(c.id), name: c.name, character: c.character, photo: profile(c.profile_path) }));
  const crew = credits?.crew ?? [];
  const director = crew.find((c) => c.job === "Director")?.name;
  const writers = crew
    .filter((c) => c.department === "Writing" || c.job === "Screenplay" || c.job === "Writer")
    .slice(0, 4)
    .map((c) => c.name);
  const featured = crew
    .filter((c) =>
      ["Director of Photography", "Editor", "Original Music Composer", "Production Design", "Costume Design"].includes(c.job),
    )
    .slice(0, 6)
    .map<CrewMember>((c) => ({
      id: String(c.id),
      name: c.name,
      role: c.job,
      department: c.department,
      photo: profile(c.profile_path),
    }));
  return { cast, crew: featured, director, writers };
}

function mapImages(images?: TMDBImages): string[] {
  const b = images?.backdrops ?? [];
  return b.slice(0, 12).map((i: TMDBImage) => backdrop(i.file_path, "w780"));
}

function mapReviews(reviews?: { results: TMDBReview[] }): Review[] {
  return (reviews?.results ?? []).slice(0, 6).map((r) => ({
    id: r.id,
    author: r.author,
    avatar: r.author_details?.avatar_path
      ? profile(r.author_details.avatar_path.startsWith("/https")
          ? r.author_details.avatar_path.slice(1)
          : r.author_details.avatar_path)
      : undefined,
    rating: r.author_details?.rating ?? 7,
    createdAt: r.created_at,
    content: r.content,
  }));
}

function mapCompanies(list?: { id: number; name: string; origin_country?: string }[]): ProductionCompany[] {
  return (list ?? []).slice(0, 6).map((c) => ({ id: String(c.id), name: c.name, country: c.origin_country }));
}

// -------------------- List item mappers --------------------

export function isMovieListItem(x: TMDBListItem): x is TMDBMovieListItem {
  return "title" in x;
}

export function mapListItem(x: TMDBListItem, forceKind?: "movie" | "tv"): MediaItem {
  const kind = forceKind ?? (isMovieListItem(x) ? "movie" : "tv");
  const isMovie = kind === "movie";
  const title = isMovie ? (x as TMDBMovieListItem).title : (x as TMDBTVListItem).name;
  const date = isMovie
    ? (x as TMDBMovieListItem).release_date
    : (x as TMDBTVListItem).first_air_date;
  return {
    id: String(x.id),
    kind,
    title: title ?? "Untitled",
    poster: poster(x.poster_path, "w500"),
    backdrop: backdrop(x.backdrop_path, "w1280"),
    overview: x.overview ?? "",
    genres: [],
    runtime: 0,
    releaseDate: date ?? "",
    rating: Math.round((x.vote_average ?? 0) * 10) / 10,
    cast: [],
  };
}

export function mapListItems(items: TMDBListItem[], forceKind?: "movie" | "tv"): MediaItem[] {
  return items.filter((it) => it.poster_path || it.backdrop_path).map((it) => mapListItem(it, forceKind));
}

export function mapMultiSearchItem(x: TMDBMultiSearchItem): MediaItem | null {
  if (x.media_type === "person") return null;
  const kind = x.media_type;
  return {
    id: String(x.id),
    kind,
    title: x.title ?? x.name ?? "Untitled",
    poster: poster(x.poster_path, "w500"),
    backdrop: backdrop(x.backdrop_path, "w1280"),
    overview: x.overview ?? "",
    genres: [],
    runtime: 0,
    releaseDate: x.release_date ?? x.first_air_date ?? "",
    rating: Math.round((x.vote_average ?? 0) * 10) / 10,
    cast: [],
  };
}

// -------------------- Detail mappers --------------------

export function mapMovieDetail(d: TMDBMovieDetail): MediaItem {
  const credits = mapCredits(d.credits);
  const usCert = d.release_dates?.results.find((r) => r.iso_3166_1 === "US")?.release_dates?.[0]?.certification;
  const logos = d.images?.logos ?? [];
  const englishLogo = logos.find((l) => (l as { iso_639_1?: string }).iso_639_1 === "en") ?? logos[0];
  return {
    id: String(d.id),
    kind: "movie",
    title: d.title,
    poster: poster(d.poster_path, "w780"),
    backdrop: backdrop(d.backdrop_path, "w1280"),
    overview: d.overview ?? "",
    genres: (d.genres ?? []).map((g) => g.name),
    runtime: d.runtime ?? 0,
    releaseDate: d.release_date ?? "",
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    cast: credits.cast,
    tagline: d.tagline || undefined,
    logo: englishLogo ? logo(englishLogo.file_path, "w500") : undefined,
    ageRating: ageRating(usCert),
    status: status(d.status),
    originalLanguage: language(d.original_language),
    spokenLanguages: (d.spoken_languages ?? [])
      .map((l) => language(l.iso_639_1))
      .filter((x): x is Language => !!x),
    budget: d.budget || undefined,
    revenue: d.revenue || undefined,
    director: credits.director,
    writers: credits.writers,
    crew: credits.crew,
    productionCompanies: mapCompanies(d.production_companies),
    gallery: mapImages(d.images),
    trailers: pickTrailer(d.videos),
    reviews: mapReviews(d.reviews),
    qualities: ["4K UHD", "HDR10", "Dolby Vision"],
    collectionId: d.belongs_to_collection ? String(d.belongs_to_collection.id) : undefined,
  };
}

export function mapTVDetail(d: TMDBTVDetail): MediaItem {
  const credits = mapCredits(d.credits);
  const usRating = d.content_ratings?.results.find((r) => r.iso_3166_1 === "US")?.rating;
  const logos = d.images?.logos ?? [];
  const englishLogo = logos.find((l) => (l as { iso_639_1?: string }).iso_639_1 === "en") ?? logos[0];
  return {
    id: String(d.id),
    kind: "tv",
    title: d.name,
    poster: poster(d.poster_path, "w780"),
    backdrop: backdrop(d.backdrop_path, "w1280"),
    overview: d.overview ?? "",
    genres: (d.genres ?? []).map((g) => g.name),
    runtime: d.episode_run_time?.[0] ?? 0,
    releaseDate: d.first_air_date ?? "",
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    cast: credits.cast,
    tagline: d.tagline || undefined,
    logo: englishLogo ? logo(englishLogo.file_path, "w500") : undefined,
    ageRating: ageRating(usRating ? `TV-${usRating}` : undefined) ?? ageRating(usRating),
    status: status(d.status),
    originalLanguage: language(d.original_language),
    spokenLanguages: (d.spoken_languages ?? [])
      .map((l) => language(l.iso_639_1))
      .filter((x): x is Language => !!x),
    director: credits.director,
    writers: credits.writers,
    crew: credits.crew,
    productionCompanies: mapCompanies(d.production_companies),
    gallery: mapImages(d.images),
    trailers: pickTrailer(d.videos),
    reviews: mapReviews(d.reviews),
    qualities: ["4K UHD", "HDR10", "Dolby Atmos"],
    network: d.networks?.[0]?.name,
    firstAirDate: d.first_air_date ?? undefined,
    lastAirDate: d.last_air_date ?? undefined,
    numberOfSeasons: d.number_of_seasons,
    numberOfEpisodes: d.number_of_episodes,
    seasons: (d.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map<Season>((s) => ({
        id: String(s.id),
        showId: String(d.id),
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview,
        poster: poster(s.poster_path, "w500"),
        airDate: s.air_date ?? "",
        episodes: [], // hydrated by season detail fetch
      })),
  };
}

export function mapEpisode(showId: string, e: TMDBEpisodeSummary | TMDBEpisodeDetail): Episode {
  return {
    id: String(e.id),
    showId,
    seasonNumber: e.season_number,
    episodeNumber: e.episode_number,
    title: e.name,
    overview: e.overview ?? "",
    runtime: e.runtime ?? 0,
    airDate: e.air_date ?? "",
    still: still(e.still_path, "w300"),
    rating: Math.round((e.vote_average ?? 0) * 10) / 10,
  };
}

export function mapSeasonDetail(showId: string, s: TMDBSeasonDetail): Season {
  return {
    id: String(s.id),
    showId,
    seasonNumber: s.season_number,
    name: s.name,
    overview: s.overview ?? "",
    poster: poster(s.poster_path, "w500"),
    airDate: s.air_date ?? "",
    episodes: (s.episodes ?? []).map((e) => mapEpisode(showId, e)),
  };
}

export function mapCollection(c: TMDBCollectionDetail): Collection & { items: MediaItem[] } {
  return {
    id: String(c.id),
    title: c.name,
    subtitle: undefined,
    cover: backdrop(c.backdrop_path ?? c.poster_path, "w1280") || poster(c.poster_path, "w780"),
    itemIds: (c.parts ?? []).map((p) => String(p.id)),
    items: mapListItems(c.parts ?? [], "movie"),
  };
}