import { MovieHero } from "./MovieHero";
import type { MediaItem } from "@/types/media";

// TV hero shares the movie hero surface — extra metadata (seasons/episodes)
// is rendered by MetadataPanel below. Keeping this as a thin adapter so the
// two page routes can diverge later without a component rename.
export function TVHero({ item }: { item: MediaItem }) {
  return <MovieHero item={item} />;
}