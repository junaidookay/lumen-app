import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { Button } from "@/components/ui/button";
import { listHistory, clearHistory } from "@/services/library";
import { getMedia } from "@/services/media";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library/history")({
  head: () => ({ meta: [{ title: "Watch History — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => listHistory(100) });
  const clearMut = useMutation({ mutationFn: clearHistory, onSuccess: () => { qc.invalidateQueries({ queryKey: ["history"] }); toast.success("History cleared"); } });
  const rows = (data ?? []).map((h) => ({ h, item: getMedia(h.media_id) })).filter((x) => x.item);
  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-28 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand">Your library</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Watch History</h1>
            <p className="mt-2 text-sm text-muted-foreground">A record of what you've watched.</p>
          </div>
          {rows.length > 0 && <Button variant="ghost" onClick={() => clearMut.mutate()}>Clear history</Button>}
        </header>
        <LibraryTabs />
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : rows.length === 0 ? (
          <div className="rounded-3xl border border-white/5 glass p-16 text-center text-sm text-muted-foreground">Nothing watched yet.</div>
        ) : (
          <ul className="divide-y divide-white/5 rounded-3xl border border-white/5 glass">
            {rows.map(({ h, item }) => (
              <li key={h.id} className="flex items-center gap-4 p-4 transition hover:bg-white/[0.02]">
                <img src={item!.poster} alt="" className="h-16 w-12 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={item!.kind === "tv" ? "/tv/$id" : "/movie/$id"} params={{ id: item!.id }} className="truncate text-sm font-medium hover:text-brand">{item!.title}</Link>
                  <p className="text-xs text-muted-foreground">{h.season && h.episode ? `S${h.season} · E${h.episode} · ` : ""}{timeAgo(h.watched_at)}</p>
                </div>
                <Link to="/watch/$kind/$id" params={{ kind: item!.kind, id: item!.id }} search={{ season: h.season ?? 1, episode: h.episode ?? 1 }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Rewatch</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}