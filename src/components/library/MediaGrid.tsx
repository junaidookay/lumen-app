import { MediaCard } from "@/components/cards/MediaCard";
import type { MediaItem } from "@/types/media";

export function MediaGrid({ items, emptyLabel = "Nothing here yet." }: { items: MediaItem[]; emptyLabel?: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-white/5 glass p-16 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((m) => (
        <MediaCard key={m.id} item={m} />
      ))}
    </div>
  );
}