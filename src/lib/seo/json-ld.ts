import type { TMDBMovieListItem, TMDBTVListItem } from "@/lib/tmdb/types";

export function movieJsonLd(movie: TMDBMovieListItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    image: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined,
    dateCreated: movie.release_date,
    aggregateRating: movie.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: movie.vote_average,
        }
      : undefined,
  };
}

export function tvSeriesJsonLd(show: TMDBTVListItem) {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: show.name,
    description: show.overview,
    image: show.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : undefined,
    dateCreated: show.first_air_date,
    aggregateRating: show.vote_average
      ? {
          "@type": "AggregateRating",
          ratingValue: show.vote_average,
        }
      : undefined,
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
