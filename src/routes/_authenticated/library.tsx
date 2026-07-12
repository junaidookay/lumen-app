import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { MediaGrid } from "@/components/library/MediaGrid";
import { Button } from "@/components/ui/button";
import { listWatchlist, removeFromWatchlist } from "@/services/library";
import { getMedia } from "@/services/media";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "My Watchlist — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["watchlist"], queryFn: listWatchlist });
  const items = (data ?? []).map((r) => getMedia(r.media_id)).filter(Boolean) as any[];
  const clearMut = useMutation({
    mutationFn: async () => { await Promise.all((data ?? []).map((r) => removeFromWatchlist(r.media_id))); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["watchlist"] }); toast.success("Watchlist cleared"); },
  });
  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-28 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand">Your library</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Watchlist</h1>
            <p className="mt-2 text-sm text-muted-foreground">Titles you've saved to watch later.</p>
          </div>
          {items.length > 0 && <Button variant="ghost" onClick={() => clearMut.mutate()}>Clear all</Button>}
        </header>
        <LibraryTabs />
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : <MediaGrid items={items} emptyLabel="Your watchlist is empty. Save titles to watch later." />}
      </div>
    </AppShell>
  );
}