import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Play } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import { listContinueWatching, removeContinueWatching } from "@/services/library";
import { getMedia } from "@/services/media";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library/continue")({
  head: () => ({ meta: [{ title: "Continue Watching — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["continue-watching"], queryFn: listContinueWatching });
  const remove = useMutation({
    mutationFn: (media_id: string) => removeContinueWatching(media_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["continue-watching"] }); toast.success("Removed"); },
  });
  const rows = (data ?? []).map((r) => ({ row: r, item: getMedia(r.media_id) })).filter((x) => x.item);
  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-28 sm:px-6 lg:px-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Your library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Continue Watching</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick up right where you left off.</p>
        </header>
        <LibraryTabs />
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : rows.length === 0 ? (
          <div className="rounded-3xl border border-white/5 glass p-16 text-center text-sm text-muted-foreground">Nothing in progress yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ row, item }) => {
              const pct = row.duration_seconds ? Math.min(100, (row.progress_seconds / row.duration_seconds) * 100) : 30;
              return (
                <div key={row.id} className="group relative overflow-hidden rounded-2xl border border-white/5 glass">
                  <div className="relative aspect-video">
                    <img src={item!.backdrop} alt={item!.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <Link to="/watch/$kind/$id" params={{ kind: item!.kind, id: item!.id }} search={{ season: row.season ?? 1, episode: row.episode ?? 1 }} className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-black"><Play className="h-5 w-5 fill-current" /></span>
                    </Link>
                    <button onClick={() => remove.mutate(row.media_id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 opacity-0 transition hover:bg-black/80 group-hover:opacity-100" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-sm font-semibold">{item!.title}</h3>
                    {row.season && row.episode && <p className="text-xs text-muted-foreground">S{row.season} · E{row.episode}</p>}
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}