import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/library";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Watch Box" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const markOne = useMutation({ mutationFn: (id: string) => markNotificationRead(id, true), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand">Account</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Notifications</h1>
            <p className="mt-2 text-sm text-muted-foreground">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
          </div>
          {unread > 0 && <Button variant="ghost" onClick={() => markAll.mutate()}>Mark all read</Button>}
        </header>
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : items.length === 0 ? (
          <div className="rounded-3xl border border-white/5 glass p-16 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5 rounded-3xl border border-white/5 glass">
            {items.map((n) => (
              <li key={n.id} className={cn("flex gap-4 p-5", !n.read && "bg-brand/5")}>
                <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read && <button onClick={() => markOne.mutate(n.id)} className="grid h-8 w-8 place-items-center rounded-full glass hover:bg-white/10" aria-label="Mark read"><Check className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}