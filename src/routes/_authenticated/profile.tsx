import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfile, updateProfile } from "@/services/library";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["profile", user?.id], queryFn: () => getProfile(user!.id), enabled: !!user });
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setDisplayName(data.display_name ?? ""); setUsername(data.username ?? ""); setBio(data.bio ?? ""); setAvatarUrl(data.avatar_url ?? ""); } }, [data]);
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile(user.id, {
        display_name: displayName.trim().slice(0, 60) || null,
        username: username.trim().slice(0, 30) || null,
        bio: bio.trim().slice(0, 500) || null,
        avatar_url: avatarUrl.trim() || null,
      });
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile updated");
    } catch (err: any) { toast.error(err?.message ?? "Failed to save"); } finally { setBusy(false); }
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">How you appear across Lumen.</p>
        </header>
        <form onSubmit={onSave} className="space-y-6 rounded-3xl border border-white/5 glass p-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback>{(displayName || user?.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="dn">Display name</Label><Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} /></div>
            <div><Label htmlFor="un">Username</Label><Input id="un" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} /></div>
          </div>
          <div><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} /></div>
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <Button type="submit" disabled={busy} className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90">{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </div>
    </AppShell>
  );
}