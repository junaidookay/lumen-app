import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { MediaGrid } from "@/components/library/MediaGrid";
import { listFavorites } from "@/services/library";
import { getMedia } from "@/services/media";

export const Route = createFileRoute("/_authenticated/library/favorites")({
  head: () => ({ meta: [{ title: "Favorites — Watch Box" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: listFavorites });
  const items = (data ?? []).map((r) => getMedia(r.media_id)).filter(Boolean) as any[];
  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-28 sm:px-6 lg:px-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Your library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Favorites</h1>
          <p className="mt-2 text-sm text-muted-foreground">The films and shows you love most.</p>
        </header>
        <LibraryTabs />
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : <MediaGrid items={items} emptyLabel="No favorites yet. Tap the heart on any title." />}
      </div>
    </AppShell>
  );
}