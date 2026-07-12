import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSettings, updateSettings, type UserSettings } from "@/services/library";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Row({ title, description, control }: { title: string; description: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/5 py-5 last:border-0">
      <div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div>
      <div>{control}</div>
    </div>
  );
}

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", user?.id], queryFn: () => getSettings(user!.id), enabled: !!user });
  const [s, setS] = useState<Partial<UserSettings>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  async function save() {
    if (!user) return;
    setBusy(true);
    try { await updateSettings(user.id, s); qc.invalidateQueries({ queryKey: ["settings", user.id] }); toast.success("Settings saved"); }
    catch (err: any) { toast.error(err?.message ?? "Failed to save"); } finally { setBusy(false); }
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Playback, notifications, and preferences.</p>
        </header>
        <div className="rounded-3xl border border-white/5 glass p-8">
          <h2 className="mb-1 text-lg font-semibold">Playback</h2>
          <div className="mt-3">
            <Row title="Autoplay next episode" description="Automatically start the next episode when one finishes." control={<Switch checked={!!s.autoplay} onCheckedChange={(v) => setS({ ...s, autoplay: v })} />} />
            <Row title="Autoplay previews" description="Play trailers on hover and while browsing." control={<Switch checked={!!s.autoplay_previews} onCheckedChange={(v) => setS({ ...s, autoplay_previews: v })} />} />
            <Row title="Playback quality" description="Higher quality uses more bandwidth." control={
              <Select value={s.quality ?? "auto"} onValueChange={(v) => setS({ ...s, quality: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="sd">SD</SelectItem><SelectItem value="hd">HD</SelectItem><SelectItem value="4k">4K</SelectItem></SelectContent>
              </Select>
            } />
          </div>
          <h2 className="mb-1 mt-8 text-lg font-semibold">Language & content</h2>
          <div className="mt-3">
            <Row title="Language" description="Interface language for menus and captions." control={
              <Select value={s.language ?? "en"} onValueChange={(v) => setS({ ...s, language: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="es">Español</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="de">Deutsch</SelectItem><SelectItem value="ja">日本語</SelectItem></SelectContent>
              </Select>
            } />
            <Row title="Mature content" description="Allow explicit and mature-rated titles." control={<Switch checked={!!s.mature_content} onCheckedChange={(v) => setS({ ...s, mature_content: v })} />} />
          </div>
          <h2 className="mb-1 mt-8 text-lg font-semibold">Notifications</h2>
          <div className="mt-3">
            <Row title="In-app notifications" description="Announcements, new episodes, and recommendations." control={<Switch checked={!!s.notifications_enabled} onCheckedChange={(v) => setS({ ...s, notifications_enabled: v })} />} />
            <Row title="Email notifications" description="Occasional emails from Lumen." control={<Switch checked={!!s.email_notifications} onCheckedChange={(v) => setS({ ...s, email_notifications: v })} />} />
          </div>
          <div className="mt-8 flex justify-end">
            <Button onClick={save} disabled={busy} className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90">{busy ? "Saving…" : "Save preferences"}</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}