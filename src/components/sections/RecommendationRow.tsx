import type { MediaItem } from "@/types/media";
import { MediaRow } from "./MediaRow";

export function RecommendationRow({ title, items, subtitle }: { title: string; items: MediaItem[]; subtitle?: string }) {
  return <MediaRow row={{ id: `rec-${title}`, title, subtitle, items }} />;
}

export function SimilarContentRow({ title = "More like this", items }: { title?: string; items: MediaItem[] }) {
  return <MediaRow row={{ id: `sim-${title}`, title, items }} />;
}