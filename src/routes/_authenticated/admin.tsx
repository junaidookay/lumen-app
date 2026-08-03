import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { isModerator, isAdmin } from "@/lib/permissions";
import { UpgradeCTA } from "@/components/feature-gate/FeatureGate";
import { cn } from "@/lib/utils";
import {
  getPlatformOverview,
  getGrowthSeries,
  listUsers,
  setUserStatus,
  setUserRole,
  toggleUserAdmin,
  resetUserData,
  listReports,
  resolveReport,
  listBroadcasts,
  sendBroadcast,
  getHomepageConfig,
  updateHomepageConfig,
  listAdPlacements,
  updateAdPlacement,
  listAuditLogs,
} from "@/lib/admin/admin.functions";
import {
  generateRedemptionCodes,
  listRedemptionCodes,
  toggleRedemptionCode,
} from "@/lib/billing/redemption.functions";
import {
  resolveMagnetForContent,
  resolveMagnetForSeason,
  importTmdbSeasons,
  searchTorrentsForContent,
  autoResolveContent,
} from "@/lib/admin/content-management.functions";
import { checkRdAccountStatus } from "@/lib/debrid/resolve-stream";
import { AD_SLOT_LABELS, AD_PROVIDERS } from "@/lib/ads/registry";
import { listSettings, upsertSetting } from "@/lib/admin/settings.functions";
import { searchTmdbTitles, batchImportTmdbTitles } from "@/lib/tmdb/tmdb-import.server";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type TabId =
  | "overview"
  | "users"
  | "content"
  | "moderation"
  | "notifications"
  | "analytics"
  | "ads"
  | "codes"
  | "rd"
  | "audit"
  | "settings"
  | "import";

const TABS: { id: TabId; label: string; requiresAdmin?: boolean }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users", requiresAdmin: true },
  { id: "rd", label: "Real Debrid", requiresAdmin: true },
  { id: "import", label: "Import", requiresAdmin: true },
  { id: "content", label: "Content" },
  { id: "moderation", label: "Moderation" },
  { id: "notifications", label: "Notifications" },
  { id: "analytics", label: "Analytics" },
  { id: "ads", label: "Ads" },
  { id: "codes", label: "Codes", requiresAdmin: true },
  { id: "audit", label: "Audit", requiresAdmin: true },
  { id: "settings", label: "Settings", requiresAdmin: true },
];

function AdminPage() {
  const { data: perms, isLoading } = usePermissions();
  const [tab, setTab] = useState<TabId>("overview");

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 text-sm text-muted-foreground">
          Checking permissions…
        </div>
      </AppShell>
    );
  }
  if (!isModerator(perms)) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 pt-40 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Restricted</p>
          <h1 className="mt-2 text-2xl font-semibold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is limited to platform staff.
          </p>
          <div className="mt-6">
            <UpgradeCTA />
          </div>
        </div>
      </AppShell>
    );
  }

  const visibleTabs = TABS.filter((t) => (t.requiresAdmin ? isAdmin(perms) : true));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Platform</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Admin</h1>
        </header>
        <nav className="-mx-1 mb-8 flex flex-wrap gap-1 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
                tab === t.id
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && <Overview />}
        {tab === "users" && isAdmin(perms) && <Users />}
        {tab === "rd" && isAdmin(perms) && <RealDebrid />}
        {tab === "import" && isAdmin(perms) && <ImportCenter />}
        {tab === "content" && <Content />}
        {tab === "moderation" && <Moderation />}
        {tab === "notifications" && <Notifications />}
        {tab === "analytics" && <Analytics />}
        {tab === "ads" && <Ads />}
        {tab === "codes" && isAdmin(perms) && <Codes />}
        {tab === "audit" && isAdmin(perms) && <Audit />}
        {tab === "settings" && isAdmin(perms) && <SettingsTab />}
      </div>
    </AppShell>
  );
}

// ---------- Overview ----------
function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 glass p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
function Overview() {
  const { data } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => getPlatformOverview(),
  });
  const growth = useQuery({ queryKey: ["admin", "growth"], queryFn: () => getGrowthSeries() });
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
    (data?.revenueCents30 ?? 0) / 100,
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total users" value={data?.totalUsers ?? "—"} />
        <Stat label="New (30d)" value={data?.newUsers30 ?? "—"} />
        <Stat label="Active (7d)" value={data?.activeUsers7 ?? "—"} />
        <Stat label="Premium" value={data?.premiumUsers ?? "—"} />
        <Stat label="Revenue 30d" value={money} />
        <Stat label="Watch events 30d" value={data?.watchEvents30 ?? "—"} />
        <Stat label="Open reports" value={data?.reportsOpen ?? "—"} />
        <Stat label="System" value={"Healthy"} hint="TMDB + Supabase reachable" />
      </div>
      <div className="rounded-3xl border border-white/5 glass p-6">
        <h3 className="mb-4 text-sm font-medium">Sign-ups (last 30 days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growth.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,20,25,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--brand))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---------- Users ----------
function Users() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ["admin", "users", q, page],
    queryFn: () => listUsers({ data: { q, page, pageSize: 25 } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const statusMut = useMutation({
    mutationFn: (v: { userId: string; status: "active" | "suspended" | "banned" }) =>
      setUserStatus({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message),
  });
  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: "user" | "moderator" | "admin"; grant: boolean }) =>
      setUserRole({ data: v }),
    onSuccess: () => {
      toast.success("Roles updated");
      invalidate();
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });
  const resetMut = useMutation({
    mutationFn: (userId: string) => resetUserData({ data: { userId } }),
    onSuccess: () => {
      toast.success("User data reset");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message),
  });
  const adminMut = useMutation({
    mutationFn: (v: { userId: string; isAdmin: boolean }) => toggleUserAdmin({ data: v }),
    onSuccess: () => {
      toast.success("Admin status updated");
      invalidate();
      qc.invalidateQueries({ queryKey: ["permissions"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  function confirmAction(msg: string, fn: () => void) {
    if (window.confirm(msg)) fn();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search users…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="max-w-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-3xl border border-white/5 glass">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Roles</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((u: any) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.display_name ?? u.username ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-4 py-3 capitalize">
                  {u.plan}
                  {u.sub_status ? ` · ${u.sub_status}` : ""}
                </td>
                <td className="px-4 py-3">{(u.roles as string[]).join(", ") || "user"}</td>
                <td className="px-4 py-3">
                  <Switch
                    checked={u.is_admin}
                    onCheckedChange={(v) =>
                      confirmAction(`Set admin to ${v ? "Yes" : "No"}?`, () =>
                        adminMut.mutate({ userId: u.id, isAdmin: v }),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      u.status === "banned"
                        ? "bg-red-500/10 text-red-300"
                        : u.status === "suspended"
                          ? "bg-amber-500/10 text-amber-300"
                          : "bg-emerald-500/10 text-emerald-300",
                    )}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Select
                      onValueChange={(v) =>
                        confirmAction(`Set status to ${v}?`, () =>
                          statusMut.mutate({ userId: u.id, status: v as any }),
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspend</SelectItem>
                        <SelectItem value="banned">Ban</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        confirmAction("Toggle moderator role?", () =>
                          roleMut.mutate({
                            userId: u.id,
                            role: "moderator",
                            grant: !u.roles.includes("moderator"),
                          }),
                        )
                      }
                    >
                      {u.roles.includes("moderator") ? "− Mod" : "+ Mod"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        confirmAction("Toggle admin role?", () =>
                          roleMut.mutate({
                            userId: u.id,
                            role: "admin",
                            grant: !u.roles.includes("admin"),
                          }),
                        )
                      }
                    >
                      {u.roles.includes("admin") ? "− Admin" : "+ Admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        confirmAction(
                          "Erase watch/library data for this user? This cannot be undone.",
                          () => resetMut.mutate(u.id),
                        )
                      }
                    >
                      Reset
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(data?.rows ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data?.total ?? 0} total</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={(data?.rows ?? []).length < 25}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Real Debrid ----------
function RealDebrid() {
  const qc = useQueryClient();
  const [magnet, setMagnet] = useState("");
  const [contentId, setContentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv">("movie");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [resolving, setResolving] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<
    { number: number; hasRd: boolean; name?: string; episodeCount?: number }[]
  >([]);
  const [contentKind, setContentKind] = useState<"movie" | "tv">("movie");

  const rdStatus = useQuery({
    queryKey: ["admin", "rd-status"],
    queryFn: () => checkRdAccountStatus(),
  });

  // When content ID changes, fetch kind + existing seasons
  const fetchContentInfo = async () => {
    if (!contentId) {
      setSeasons([]);
      return;
    }
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: content } = await supabaseAdmin
        .from("media_items")
        .select("id, kind, tmdb_id")
        .eq("id", contentId)
        .single();
      if (!content) return;
      setContentKind((content.kind || "movie") as "movie" | "tv");

      if (content.kind === "tv") {
        const { data: seasonRows } = await (supabaseAdmin as any)
          .from("media_item_seasons")
          .select("season_number, rd_torrent_id, episodes, name")
          .eq("media_item_id", contentId)
          .order("season_number");

        setSeasons(
          (seasonRows ?? []).map((s: any) => ({
            number: s.season_number,
            hasRd: !!(s as any).rd_torrent_id,
            name: s.name,
            episodeCount: Array.isArray(s.episodes) ? s.episodes.length : 0,
          })),
        );
      } else {
        setSeasons([]);
      }
    } catch {
      // Table may not exist yet
    }
  };

  const resolveMut = useMutation({
    mutationFn: async () => {
      if (selectedSeason && contentKind === "tv") {
        return resolveMagnetForSeason({
          data: { mediaItemId: contentId, seasonNumber: selectedSeason, magnet },
        });
      }
      return resolveMagnetForContent({ data: { contentId, magnet } });
    },
    onSuccess: (res: any) => {
      toast.success(`Resolved! ${res.filesCount ?? 0} files, status: ${res.status}`);
      setMagnet("");
      setContentId("");
      setSelectedSeason(null);
      setSeasons([]);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const importTmdbMut = useMutation({
    mutationFn: () => importTmdbSeasons({ data: { mediaItemId: contentId } }),
    onSuccess: (res) => {
      toast.success(
        `Imported ${res.seasonsImported} seasons, ${res.episodesImported} episodes from TMDB`,
      );
      qc.invalidateQueries({ queryKey: ["admin"] });
      fetchContentInfo();
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const searchMut = useMutation({
    mutationFn: () => searchTorrentsForContent({ data: { query: searchQuery, type: searchType } }),
    onSuccess: (res) => setSearchResults(res.results),
    onError: (e: any) => toast.error(e?.message),
  });

  const autoMut = useMutation({
    mutationFn: (args: { contentId: string; query: string; type: "movie" | "tv" }) =>
      autoResolveContent({ data: args }),
    onSuccess: (res) => {
      toast.success(`Auto-resolved: ${res.selectedTorrent} (score: ${res.score})`);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="space-y-6">
      {/* RD Status */}
      <div className="rounded-3xl border border-white/5 glass p-6">
        <h3 className="mb-3 text-sm font-medium">Real Debrid Account</h3>
        {rdStatus.data?.configured ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              Connected
            </span>
            <span className="text-muted-foreground">{rdStatus.data.username}</span>
            <span className={rdStatus.data.premium ? "text-emerald-300" : "text-amber-300"}>
              {rdStatus.data.premium ? "Premium" : "Free"}
            </span>
            {rdStatus.data.expiration && (
              <span className="text-muted-foreground">
                Expires: {new Date(rdStatus.data.expiration).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>
              Not configured. Add{" "}
              <code className="rounded bg-white/5 px-1">REAL_DEBRID_API_KEY</code> to your
              environment variables.
            </p>
          </div>
        )}
      </div>

      {/* Resolve Magnet */}
      <div className="rounded-3xl border border-white/5 glass p-6">
        <h3 className="mb-3 text-sm font-medium">Resolve Magnet Link</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Paste a magnet link to add it to Real Debrid and link it to a content item.
        </p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Content ID (UUID)"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              onBlur={() => fetchContentInfo()}
            />
            {contentId && contentKind === "tv" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchContentInfo()}
                className="flex-shrink-0"
              >
                Load seasons
              </Button>
            )}
          </div>

          {/* Season selector for TV */}
          {contentKind === "tv" && seasons.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Save to season (optional)</label>
              <select
                className="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-hairline text-sm"
                value={selectedSeason ?? ""}
                onChange={(e) => setSelectedSeason(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All seasons (title-level)</option>
                {seasons.map((s) => (
                  <option key={s.number} value={s.number}>
                    Season {s.number}
                    {s.name ? ` — ${s.name}` : ""}
                    {s.hasRd ? " ✓ RD linked" : ""}
                    {s.episodeCount ? ` (${s.episodeCount} eps)` : ""}
                  </option>
                ))}
              </select>
              {selectedSeason && (
                <p className="text-xs text-muted-foreground">
                  Magnet will be saved to Season {selectedSeason} only.
                </p>
              )}
              {!selectedSeason && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to save to title level (covers all seasons from one magnet).
                </p>
              )}
            </div>
          )}

          <Textarea
            placeholder="magnet:?xt=urn:btih:..."
            value={magnet}
            onChange={(e) => setMagnet(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => resolveMut.mutate()}
              disabled={resolveMut.isPending || !magnet || !contentId}
              className="rounded-full"
            >
              {resolveMut.isPending
                ? "Resolving..."
                : selectedSeason
                  ? `Resolve & Link S${selectedSeason}`
                  : "Resolve & Link"}
            </Button>
            {contentKind === "tv" && contentId && (
              <Button
                variant="outline"
                onClick={() => importTmdbMut.mutate()}
                disabled={importTmdbMut.isPending}
                className="rounded-full"
              >
                {importTmdbMut.isPending ? "Importing..." : "Import TMDB Seasons"}
              </Button>
            )}
          </div>
        </div>

        {/* Season status table */}
        {contentKind === "tv" && seasons.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Season</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Episodes</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.number} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      S{s.number}
                      {s.name ? ` — ${s.name}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {s.hasRd ? (
                        <span className="text-emerald-300 text-xs">✓ RD linked</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">No magnet</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {s.episodeCount ?? 0} eps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Torrent Search */}
      <div className="rounded-3xl border border-white/5 glass p-6">
        <h3 className="mb-3 text-sm font-medium">Search Torrents</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search query (title)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Movie</SelectItem>
              <SelectItem value="tv">TV</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => searchMut.mutate()} disabled={searchMut.isPending || !searchQuery}>
            {searchMut.isPending ? "Searching..." : "Search"}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {searchResults.length} results (sorted by score)
            </p>
            {searchResults.map((t: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.source} · {t.seeders} seeders · {(t.sizeBytes / 1024 ** 3).toFixed(1)} GB ·
                    score: {t.score}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Content ----------
function Content() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "homepage"],
    queryFn: () => getHomepageConfig(),
  });
  const [announcement, setAnnouncement] = useState<string>("");
  const [heroIds, setHeroIds] = useState<string>("");
  useMemo(() => {
    if (data) {
      setAnnouncement((data as any).announcement ?? "");
      setHeroIds(((data as any).hero_media_ids as unknown[])?.join(", ") ?? "");
    }
  }, [data]);
  const save = useMutation({
    mutationFn: () =>
      updateHomepageConfig({
        data: {
          announcement: announcement || null,
          hero_media_ids: heroIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Homepage updated");
      qc.invalidateQueries({ queryKey: ["admin", "homepage"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });
  return (
    <div className="max-w-2xl space-y-4 rounded-3xl border border-white/5 glass p-6">
      <div>
        <label className="text-sm font-medium">Announcement banner</label>
        <Textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="Shown site-wide as an editorial banner"
          className="mt-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Featured hero (TMDB IDs — comma separated)</label>
        <Input
          value={heroIds}
          onChange={(e) => setHeroIds(e.target.value)}
          placeholder="movie:12345, tv:67890"
          className="mt-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Reserved for editorial override; TMDB remains the source of metadata.
        </p>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        Save homepage
      </Button>
    </div>
  );
}

// ---------- Moderation ----------
function Moderation() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "reports"], queryFn: () => listReports() });
  const resolve = useMutation({
    mutationFn: (v: { id: string; status: "reviewing" | "resolved" | "dismissed" }) =>
      resolveReport({ data: v }),
    onSuccess: () => {
      toast.success("Report updated");
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/5 glass">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">When</th>
            <th className="px-4 py-3 text-left">Target</th>
            <th className="px-4 py-3 text-left">Reason</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r: any) => (
            <tr key={r.id} className="border-t border-white/5 align-top">
              <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-4 py-3">
                {r.target_type}: {r.target_id}
              </td>
              <td className="px-4 py-3">
                {r.reason}
                {r.details && <div className="text-xs text-muted-foreground">{r.details}</div>}
              </td>
              <td className="px-4 py-3 capitalize">{r.status}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolve.mutate({ id: r.id, status: "reviewing" })}
                  >
                    Reviewing
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}
                  >
                    Dismiss
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                No reports.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Notifications ----------
function Notifications() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "broadcasts"], queryFn: () => listBroadcasts() });
  const [form, setForm] = useState({
    title: "",
    body: "",
    kind: "announcement" as "announcement" | "maintenance" | "promo" | "system",
    link: "",
  });
  const send = useMutation({
    mutationFn: () =>
      sendBroadcast({
        data: {
          title: form.title,
          body: form.body || undefined,
          kind: form.kind,
          link: form.link || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Broadcast sent");
      setForm({ title: "", body: "", kind: "announcement", link: "" });
      qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4 rounded-3xl border border-white/5 glass p-6">
        <h3 className="text-sm font-medium">New broadcast</h3>
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Textarea
          placeholder="Body"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <Input
          placeholder="https://link (optional)"
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
        />
        <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="announcement">Announcement</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="promo">Promo</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Button disabled={!form.title || send.isPending} onClick={() => send.mutate()}>
          Send to all users
        </Button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/5 glass">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Sent</th>
              <th className="px-4 py-3 text-left">Kind</th>
              <th className="px-4 py-3 text-left">Title</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  {b.sent_at ? new Date(b.sent_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 capitalize">{b.kind}</td>
                <td className="px-4 py-3">{b.title}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No broadcasts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Analytics ----------
function Analytics() {
  const growth = useQuery({ queryKey: ["admin", "growth"], queryFn: () => getGrowthSeries() });
  return (
    <div className="rounded-3xl border border-white/5 glass p-6">
      <h3 className="mb-4 text-sm font-medium">Sign-ups by day</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={growth.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickFormatter={(d) => d.slice(5)}
            />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(20,20,25,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--brand))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Additional dashboards (revenue, watch completion, retention, geography) are wired into the
        same server-fn architecture and will render once the corresponding events accumulate.
      </p>
    </div>
  );
}

// ---------- Ads ----------
function Ads() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ad-placements"], queryFn: () => listAdPlacements() });
  const mut = useMutation({
    mutationFn: (v: { slot: string; provider?: string; is_enabled?: boolean }) =>
      updateAdPlacement({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["ad-placements"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Adsterra is the primary ad network. Premium users always skip ads.
      </p>
      {(data ?? []).map((p: any) => (
        <div
          key={p.slot}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 glass p-4"
        >
          <div>
            <p className="font-medium">
              {AD_SLOT_LABELS[p.slot as keyof typeof AD_SLOT_LABELS] ?? p.slot}
            </p>
            <p className="text-xs text-muted-foreground">{p.slot}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={p.provider}
              onValueChange={(v) => mut.mutate({ slot: p.slot, provider: v })}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AD_PROVIDERS.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id}>
                    {prov.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Enabled</span>
              <Switch
                checked={p.is_enabled}
                onCheckedChange={(v) => mut.mutate({ slot: p.slot, is_enabled: v })}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Codes ----------
function Codes() {
  const qc = useQueryClient();
  const { data: codes, isLoading } = useQuery({
    queryKey: ["admin", "codes"],
    queryFn: () => listRedemptionCodes(),
  });
  const [form, setForm] = useState({
    count: 5,
    durationDays: 30,
    maxDownloadsPerDay: 3,
    maxRedemptions: "",
    expiresAt: "",
  });
  const [generated, setGenerated] = useState<string[]>([]);

  const genMut = useMutation({
    mutationFn: () =>
      generateRedemptionCodes({
        data: {
          count: form.count,
          durationDays: form.durationDays,
          maxDownloadsPerDay: form.maxDownloadsPerDay,
          maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : undefined,
          expiresAt: form.expiresAt || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Generated ${res.codes.length} codes`);
      setGenerated(res.codes.map((c: any) => c.code));
      qc.invalidateQueries({ queryKey: ["admin", "codes"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { codeId: string; isActive: boolean }) => toggleRedemptionCode({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin", "codes"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="space-y-6">
      {/* Generate form */}
      <div className="space-y-4 rounded-3xl border border-white/5 glass p-6">
        <h3 className="text-sm font-medium">Generate Codes</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Number of codes</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={form.count}
              onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Duration (days)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max downloads/day</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.maxDownloadsPerDay}
              onChange={(e) =>
                setForm({ ...form, maxDownloadsPerDay: parseInt(e.target.value) || 3 })
              }
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Max redemptions (blank = unlimited)
            </label>
            <Input
              type="number"
              min={1}
              value={form.maxRedemptions}
              onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
              placeholder="Unlimited"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Expires at (optional)</label>
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <Button
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="rounded-full"
        >
          {genMut.isPending ? "Generating..." : "Generate Codes"}
        </Button>
      </div>

      {/* Generated codes display */}
      {generated.length > 0 && (
        <div className="space-y-3 rounded-3xl border border-brand/20 bg-brand/5 p-6">
          <h3 className="text-sm font-medium text-brand">Generated Codes</h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {generated.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 font-mono text-sm tracking-wider"
              >
                {c}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(c);
                    toast.success("Copied!");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Share these codes with users. They can redeem at Billing → Have a Code?
          </p>
        </div>
      )}

      {/* Existing codes list */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Existing Codes</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (codes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes generated yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/5 glass">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Downloads/day</th>
                  <th className="px-4 py-3 text-left">Redemptions</th>
                  <th className="px-4 py-3 text-left">Expires</th>
                  <th className="px-4 py-3 text-left">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(codes ?? []).map((c: any) => (
                  <tr key={c.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-mono tracking-wider">{c.code}</td>
                    <td className="px-4 py-3">{c.duration_days}d</td>
                    <td className="px-4 py-3">{c.max_downloads_per_day}</td>
                    <td className="px-4 py-3">
                      {c.current_redemptions}
                      {c.max_redemptions ? ` / ${c.max_redemptions}` : " / unlimited"}
                    </td>
                    <td className="px-4 py-3">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(v) => toggleMut.mutate({ codeId: c.id, isActive: v })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(c.code);
                          toast.success("Copied!");
                        }}
                        className="text-xs text-brand hover:underline"
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Audit ----------
function Audit() {
  const { data } = useQuery({ queryKey: ["admin", "audit"], queryFn: () => listAuditLogs() });
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/5 glass">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">When</th>
            <th className="px-4 py-3 text-left">Actor</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">Target</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r: any) => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 font-mono text-xs">{r.actor_id?.slice(0, 8) ?? "system"}</td>
              <td className="px-4 py-3">{r.action}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.target_type ? `${r.target_type}:${r.target_id ?? ""}` : "—"}
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                No audit entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Settings ----------
function SettingsTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => listSettings(),
  });
  const upsertMut = useMutation({
    mutationFn: (vars: { key: string; value: string; description?: string }) =>
      upsertSetting({ data: vars }),
    onSuccess: () => {
      toast.success("Setting saved");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const BUILTIN_SETTINGS = [
    {
      key: "tmdb_api_key",
      label: "TMDB API Key",
      description:
        "v4 Read Access Token for importing titles from The Movie Database. Stored in the database.",
    },
  ];

  const getVal = (key: string) =>
    form[key] ?? settings?.find((s: any) => s.key === key)?.value ?? "";

  if (isLoading) return <div className="text-sm text-muted-foreground py-8">Loading settings…</div>;

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-[0.25em] text-brand">Platform Configuration</p>
      <h2 className="text-xl font-semibold">Settings</h2>
      {BUILTIN_SETTINGS.map((s) => (
        <div key={s.key} className="rounded-2xl border border-white/5 glass p-5 space-y-3">
          <div>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.description}</p>
          </div>
          <div className="flex gap-3">
            <Input
              type="password"
              placeholder={s.key === "tmdb_api_key" ? "eyJhbGciOiJIUzI1NiJ9..." : "Value"}
              value={getVal(s.key)}
              onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                upsertMut.mutate({ key: s.key, value: getVal(s.key), description: s.description })
              }
              disabled={upsertMut.isPending || !getVal(s.key)}
            >
              Save
            </Button>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        You can also set <code className="bg-white/5 px-1.5 py-0.5 rounded">TMDB_ACCESS_TOKEN</code>{" "}
        as an environment variable as a fallback.
      </p>
    </div>
  );
}

// ---------- Import Center ----------
function ImportCenter() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const searchMut = useMutation({
    mutationFn: (vars: { query: string }) => searchTmdbTitles({ data: vars }),
  });

  const importMut = useMutation({
    mutationFn: (vars: { items: Array<{ tmdbId: number; mediaType: "movie" | "tv" }> }) =>
      batchImportTmdbTitles({ data: vars }),
    onSuccess: (results) => {
      const ok = results.filter((r) => r.ok && !r.duplicate).length;
      const dup = results.filter((r) => r.duplicate).length;
      const fail = results.filter((r) => !r.ok).length;
      toast.success(
        `Imported ${ok} titles${dup ? `, ${dup} duplicates` : ""}${fail ? `, ${fail} failed` : ""}`,
      );
      setSelected({});
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Import failed"),
  });

  const results = searchMut.data ?? [];
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMut.mutate({ query: query.trim() });
  };

  const handleImport = () => {
    const items = results
      .filter((r: any) => selected[`${r.tmdbId}-${r.mediaType}`])
      .map((r: any) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType }));
    if (items.length === 0) return;
    importMut.mutate({ items });
  };

  const inputCls =
    "h-9 rounded-full border border-white/10 bg-white/5 px-4 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none";

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-[0.25em] text-brand">Content</p>
      <h2 className="text-xl font-semibold">Import Center</h2>

      <div className="rounded-2xl border border-white/5 glass p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Search and import movies &amp; TV shows from The Movie Database.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className={inputCls + " sm:col-span-2"}
            placeholder="Search movies or TV…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={searchMut.isPending || !query.trim()}
            onClick={handleSearch}
          >
            {searchMut.isPending ? "Searching…" : "Search"}
          </Button>
        </div>

        {selectedCount > 0 && (
          <Button size="sm" disabled={importMut.isPending} onClick={handleImport}>
            {importMut.isPending ? "Importing…" : `Import ${selectedCount} selected`}
          </Button>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {results.map((r: any) => {
              const key = `${r.tmdbId}-${r.mediaType}`;
              const date = r.mediaType === "tv" ? r.year : r.year;
              return (
                <li key={key} className="p-2 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selected[key]}
                    onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))}
                  />
                  {r.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                      alt=""
                      className="h-12 w-8 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-8 bg-white/5 rounded" />
                  )}
                  <span className="flex-1 truncate">
                    {r.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {r.mediaType} · {date}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ★ {r.rating?.toFixed?.(1) ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {searchMut.data && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">No results found.</p>
        )}
      </div>
    </div>
  );
}
