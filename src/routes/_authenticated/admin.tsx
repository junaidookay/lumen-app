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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  updateRedemptionCode,
} from "@/lib/billing/redemption.functions";
import {
  resolveMagnetForContent,
  resolveMagnetForSeason,
  importTmdbSeasons,
  searchTorrentsForContent,
  autoResolveContent,
  listMediaItemsForAdmin,
  checkInstantAvailabilityForHashes,
  listAllContent,
  updateContentTags,
  listContentTags,
  updateContent,
} from "@/lib/admin/content-management.functions";
import { checkRdAccountStatus } from "@/lib/debrid/resolve-stream";
import { AD_SLOT_LABELS, AD_PROVIDERS } from "@/lib/ads/registry";
import { listSettings, upsertSetting, uploadSettingFile } from "@/lib/admin/settings.functions";
import { searchTmdbTitles, batchImportTmdbTitles } from "@/lib/tmdb/tmdb-import.server";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Watch Box" }, { name: "robots", content: "noindex" }] }),
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
  const [selectedContentId, setSelectedContentId] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [magnet, setMagnet] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"movie" | "tv">("movie");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [instantCache, setInstantCache] = useState<Record<string, boolean>>({});
  const [filterCached, setFilterCached] = useState(false);
  const [resolvingHash, setResolvingHash] = useState<string | null>(null);
  const [savingHash, setSavingHash] = useState<string | null>(null);

  const rdStatus = useQuery({
    queryKey: ["admin", "rd-status"],
    queryFn: () => checkRdAccountStatus(),
  });

  const titlesQuery = useQuery({
    queryKey: ["admin", "media-items"],
    queryFn: () => listMediaItemsForAdmin(),
  });

  const selectedTitle = titlesQuery.data?.find((t: any) => t.id === selectedContentId);
  const isTV = selectedTitle?.kind === "tv";

  // Fetch seasons when a TV title is selected
  const { data: seasonRows } = useQuery({
    queryKey: ["admin", "seasons", selectedContentId],
    queryFn: async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await (supabaseAdmin as any)
        .from("media_item_seasons")
        .select("season_number, rd_torrent_id, episodes, name")
        .eq("media_item_id", selectedContentId)
        .order("season_number");
      return data ?? [];
    },
    enabled: isTV && !!selectedContentId,
  });

  const seasons = (seasonRows ?? []).map((s: any) => ({
    number: s.season_number as number,
    hasRd: !!s.rd_torrent_id,
    name: s.name as string | null,
    episodeCount: Array.isArray(s.episodes) ? s.episodes.length : 0,
  })) as Array<{ number: number; hasRd: boolean; name: string | null; episodeCount: number }>;

  // Resolve magnet mutation
  const resolveMut = useMutation({
    mutationFn: async () => {
      if (selectedSeason && isTV) {
        return resolveMagnetForSeason({
          data: { mediaItemId: selectedContentId, seasonNumber: selectedSeason, magnet },
        });
      }
      return resolveMagnetForContent({ data: { contentId: selectedContentId, magnet } });
    },
    onSuccess: (res: any) => {
      toast.success(`Resolved! ${res.filesCount ?? 0} files, status: ${res.status}`);
      setMagnet("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  // Import TMDB seasons mutation
  const importTmdbMut = useMutation({
    mutationFn: () => importTmdbSeasons({ data: { mediaItemId: selectedContentId } }),
    onSuccess: (res) => {
      toast.success(
        `Imported ${res.seasonsImported} seasons, ${res.episodesImported} episodes from TMDB`,
      );
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  // Search torrents mutation
  const searchMut = useMutation({
    mutationFn: () => searchTorrentsForContent({ data: { query: searchQuery, type: searchType } }),
    onSuccess: async (res) => {
      setSearchResults(res.results);
      // Check instant availability for all results
      const hashes = res.results.map((t: any) => t.info_hash).filter(Boolean);
      if (hashes.length > 0) {
        try {
          const avail = await checkInstantAvailabilityForHashes({ data: { hashes } });
          const cache: Record<string, boolean> = {};
          for (const [hash, info] of Object.entries(avail)) {
            cache[hash.toLowerCase()] = !!(info as any).cached;
          }
          setInstantCache(cache);
        } catch {
          // Ignore availability check errors
        }
      }
    },
    onError: (e: any) => toast.error(e?.message),
  });

  // Resolve from search result
  const resolveFromSearch = async (torrent: any) => {
    if (!selectedContentId) {
      toast.error("Select a title first");
      return;
    }
    setResolvingHash(torrent.info_hash);
    try {
      if (selectedSeason && isTV) {
        await resolveMagnetForSeason({
          data: {
            mediaItemId: selectedContentId,
            seasonNumber: selectedSeason,
            magnet: torrent.magnet,
          },
        });
      } else {
        await resolveMagnetForContent({
          data: { contentId: selectedContentId, magnet: torrent.magnet },
        });
      }
      toast.success(`Resolved: ${torrent.name}`);
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Resolve failed");
    } finally {
      setResolvingHash(null);
    }
  };

  const filteredResults = filterCached
    ? searchResults.filter((t: any) => instantCache[t.info_hash?.toLowerCase()])
    : searchResults;
  const cachedCount = searchResults.filter(
    (t: any) => instantCache[t.info_hash?.toLowerCase()],
  ).length;

  const inputCls =
    "h-9 rounded-full border border-white/10 bg-white/5 px-4 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none";

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
          <p className="text-sm text-muted-foreground">
            Not configured. Add <code className="rounded bg-white/5 px-1">REAL_DEBRID_API_KEY</code>{" "}
            to your environment variables.
          </p>
        )}
      </div>

      {/* Step 1: Select title */}
      <div className="rounded-3xl border border-white/5 glass p-6">
        <h3 className="mb-1 text-sm font-medium">1. Select a title to attach</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Choose an existing title from your library, then paste a magnet or search for torrents
          below.
        </p>
        <div className="space-y-3">
          <select
            className="w-full h-10 px-3 rounded-lg bg-surface border border-white/10 text-sm text-foreground"
            value={selectedContentId}
            onChange={(e) => {
              setSelectedContentId(e.target.value);
              setSelectedSeason(null);
            }}
          >
            <option value="">— Select a title —</option>
            {(titlesQuery.data ?? []).map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.kind}
                {t.year ? `, ${t.year}` : ""}){t.rd_torrent_id ? " ✓ RD" : ""}
              </option>
            ))}
          </select>

          {/* Season selector for TV */}
          {isTV && seasons.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Save to season (optional)</label>
              <select
                className="w-full h-9 px-3 rounded-lg bg-surface border border-white/10 text-sm text-foreground"
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
              {selectedSeason ? (
                <p className="text-xs text-muted-foreground">
                  Magnet will be saved to Season {selectedSeason} only.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Leave blank to save at title level (one magnet covers all seasons).
                </p>
              )}
            </div>
          )}

          {/* Season status table */}
          {isTV && seasons.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/5">
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
      </div>

      {/* Step 2: Search or paste magnet */}
      <div className="rounded-3xl border border-white/5 glass p-6">
        <h3 className="mb-1 text-sm font-medium">2. Search or paste magnet</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Search for torrents or paste a magnet link directly.
        </p>

        <div className="space-y-4">
          {/* Torrent search */}
          <div>
            <p className="text-xs font-medium mb-2">Torrent Search</p>
            <div className="flex gap-2">
              <Input
                placeholder="Search by title name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchQuery && searchMut.mutate()}
                className="flex-1"
              />
              <Select value={searchType} onValueChange={(v) => setSearchType(v as any)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="tv">TV</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => searchMut.mutate()}
                disabled={searchMut.isPending || !searchQuery}
              >
                {searchMut.isPending ? "Searching…" : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs text-muted-foreground">
                    {filteredResults.length} results ({cachedCount} cached)
                  </p>
                  <button
                    onClick={() => setFilterCached(!filterCached)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition ${filterCached ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}
                  >
                    {filterCached ? "Cached only" : "Show all"}
                  </button>
                </div>
                <div className="max-h-[420px] overflow-y-auto space-y-1">
                  {filteredResults.map((t: any, i: number) => {
                    const isCached = instantCache[t.info_hash?.toLowerCase()];
                    const isResolving = resolvingHash === t.info_hash;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.source} · {t.seeders} seeders ·{" "}
                            {(t.sizeBytes / 1024 ** 3).toFixed(1)} GB · score: {t.score}
                          </p>
                        </div>
                        {isCached !== undefined && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${isCached ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}
                          >
                            {isCached ? "Cached" : "Not cached"}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant={isCached ? "default" : "outline"}
                          disabled={!selectedContentId || isResolving}
                          onClick={() => resolveFromSearch(t)}
                          className="flex-shrink-0"
                        >
                          {isResolving ? "Resolving…" : "Resolve"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {searchMut.data && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No results found.</p>
            )}
          </div>

          {/* Manual magnet paste */}
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-medium mb-2">Or paste a magnet link directly</p>
            <Textarea
              placeholder="magnet:?xt=urn:btih:..."
              value={magnet}
              onChange={(e) => setMagnet(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => resolveMut.mutate()}
                disabled={resolveMut.isPending || !magnet || !selectedContentId}
                className="rounded-full"
              >
                {resolveMut.isPending
                  ? "Resolving…"
                  : selectedSeason
                    ? `Resolve & Link S${selectedSeason}`
                    : "Resolve & Link"}
              </Button>
              {isTV && selectedContentId && (
                <Button
                  variant="outline"
                  onClick={() => importTmdbMut.mutate()}
                  disabled={importTmdbMut.isPending}
                  className="rounded-full"
                >
                  {importTmdbMut.isPending ? "Importing…" : "Import TMDB Seasons"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Content ----------
function Content() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; overview: string; year: string; status: string; tags: string[]; landing_spots: string[] }>({
    title: "",
    overview: "",
    year: "",
    status: "published",
    tags: [],
    landing_spots: [],
  });

  const contentQuery = useQuery({
    queryKey: ["admin", "content"],
    queryFn: () => listAllContent(),
  });

  const tagsQuery = useQuery({
    queryKey: ["admin", "content-tags"],
    queryFn: () => listContentTags(),
  });

  const updateContentMut = useMutation({
    mutationFn: (v: any) => updateContent({ data: v }),
    onSuccess: () => {
      toast.success("Content updated");
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      qc.invalidateQueries({ queryKey: ["admin", "content-tags"] });
      setEditingItem(null);
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const items = (contentQuery.data ?? []).filter((item: any) => {
    if (filter !== "all" && item.kind !== filter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilter && !(item.tags ?? []).includes(tagFilter)) return false;
    return true;
  });

  const AVAILABLE_TAGS = ["featured", "trending", "new", "classic", "action", "drama", "comedy", "horror", "scifi", "romance", "documentary", "animation", "kids"];

  const LANDING_SPOTS = [
    { id: "hero", label: "Hero", desc: "Main hero carousel at top" },
    { id: "trending", label: "Trending Now", desc: "Trending section" },
    { id: "popular_movies", label: "Popular Movies", desc: "Popular movies row" },
    { id: "popular_tv", label: "Popular Shows", desc: "Popular TV shows row" },
    { id: "top_rated", label: "Top Rated", desc: "Top rated movies row" },
    { id: "coming_soon", label: "Coming Soon", desc: "Upcoming releases row" },
    { id: "in_theaters", label: "In Theaters", desc: "Now playing in theaters" },
    { id: "on_the_air", label: "On The Air", desc: "Currently airing TV" },
  ];

  function openEdit(item: any) {
    setEditingItem(item);
    setEditForm({
      title: item.title ?? "",
      overview: item.overview ?? "",
      year: item.year?.toString() ?? "",
      status: item.status ?? "published",
      tags: item.tags ?? [],
      landing_spots: item.landing_spots ?? [],
    });
  }

  function toggleEditTag(tag: string) {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  function toggleLandingSpot(spotId: string) {
    setEditForm((prev) => ({
      ...prev,
      landing_spots: prev.landing_spots.includes(spotId)
        ? prev.landing_spots.filter((s) => s !== spotId)
        : [...prev.landing_spots, spotId],
    }));
  }

  function saveEdit() {
    if (!editingItem) return;
    updateContentMut.mutate({
      mediaItemId: editingItem.id,
      title: editForm.title,
      overview: editForm.overview || null,
      year: editForm.year ? parseInt(editForm.year) : null,
      status: editForm.status,
      tags: editForm.tags,
      landing_spots: editForm.landing_spots,
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-white/10 p-1">
          {(["all", "movie", "tv"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs transition ${filter === f ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f === "movie" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search titles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 rounded-full border border-white/10 bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="h-8 rounded-full border border-white/10 bg-surface px-3 text-sm text-foreground"
        >
          <option value="">All tags</option>
          {AVAILABLE_TAGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} items</span>
      </div>

      {/* Content table */}
      <div className="overflow-x-auto rounded-3xl border border-white/5 glass">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Year</th>
              <th className="px-4 py-3 text-left">RD</th>
              <th className="px-4 py-3 text-left">Tags</th>
              <th className="px-4 py-3 text-left">Spots</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-t border-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.poster_path && (
                      <img src={item.poster_path} alt="" className="h-10 w-7 rounded object-cover" />
                    )}
                    <span className="font-medium">{item.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{item.kind}</td>
                <td className="px-4 py-3">{item.year ?? "—"}</td>
                <td className="px-4 py-3">
                  {item.rd_torrent_id ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(item.tags ?? []).map((tag: string) => (
                      <span key={tag} className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-medium text-brand">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(item.landing_spots ?? []).map((spot: string) => (
                      <span key={spot} className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        {spot.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{item.status}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {contentQuery.isLoading ? "Loading..." : "No content found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => { if (!o) setEditingItem(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              {editingItem?.kind === "tv" ? "TV Show" : "Movie"} — {editingItem?.title}
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              {/* Poster preview */}
              <div className="flex gap-4">
                {editingItem.poster_path && (
                  <img src={editingItem.poster_path} alt="" className="h-24 w-16 rounded object-cover" />
                )}
                {editingItem.backdrop_path && (
                  <img src={editingItem.backdrop_path} alt="" className="h-24 flex-1 rounded object-cover" />
                )}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Title"
                />
              </div>

              {/* Overview */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editForm.overview}
                  onChange={(e) => setEditForm((p) => ({ ...p, overview: e.target.value }))}
                  placeholder="Description / overview"
                  rows={4}
                />
              </div>

              {/* Year + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Year</label>
                  <Input
                    type="number"
                    value={editForm.year}
                    onChange={(e) => setEditForm((p) => ({ ...p, year: e.target.value }))}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-white/10 bg-surface px-3 text-sm text-foreground"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => {
                    const active = editForm.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleEditTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          active
                            ? "bg-brand text-white"
                            : "border border-white/20 text-muted-foreground hover:border-white/40 hover:text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Landing Spots */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Landing Page Sections</label>
                <p className="text-xs text-muted-foreground">Pin this item to appear at the top of these sections on the landing page.</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {LANDING_SPOTS.map((spot) => {
                    const active = editForm.landing_spots.includes(spot.id);
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => toggleLandingSpot(spot.id)}
                        className={`flex flex-col items-start rounded-xl px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border border-blue-500/50 bg-blue-500/10 text-blue-400"
                            : "border border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                        }`}
                      >
                        <span className="font-medium">{spot.label}</span>
                        <span className="text-[10px] opacity-60">{spot.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={updateContentMut.isPending}>
                  {updateContentMut.isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState("");
  const mut = useMutation({
    mutationFn: (v: { slot: string; provider?: string; is_enabled?: boolean; config?: Record<string, unknown> }) =>
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
      {(data ?? []).map((p: any) => {
        const isEditing = editingSlot === p.slot;
        const config = (p.config as any) ?? {};
        return (
          <div key={p.slot} className="rounded-2xl border border-white/5 glass p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      setEditingSlot(null);
                    } else {
                      setEditingSlot(p.slot);
                      setConfigDraft(JSON.stringify(config, null, 2));
                    }
                  }}
                >
                  {isEditing ? "Close" : "Config"}
                </Button>
              </div>
            </div>
            {isEditing && (
              <div className="space-y-2 border-t border-white/5 pt-3">
                <p className="text-xs text-muted-foreground">
                  JSON config. For Adsterra: set <code className="bg-white/5 px-1">banner_code</code> for banner/inline slots.
                  For house ads: set <code className="bg-white/5 px-1">headline</code> and <code className="bg-white/5 px-1">body</code>.
                </p>
                <Textarea
                  value={configDraft}
                  onChange={(e) => setConfigDraft(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder='{"banner_code": "<iframe>...</iframe>", "headline": "Ad title", "body": "Ad description"}'
                />
                <Button
                  size="sm"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(configDraft);
                      mut.mutate({ slot: p.slot, config: parsed });
                      setEditingSlot(null);
                    } catch {
                      toast.error("Invalid JSON");
                    }
                  }}
                  disabled={mut.isPending}
                >
                  Save config
                </Button>
              </div>
            )}
          </div>
        );
      })}
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

  const updateMut = useMutation({
    mutationFn: (v: { codeId: string; maxDownloadsPerDay?: number }) => updateRedemptionCode({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      setEditingCode(null);
      qc.invalidateQueries({ queryKey: ["admin", "codes"] });
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const [editingCode, setEditingCode] = useState<any>(null);
  const [editDownloads, setEditDownloads] = useState(3);

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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCode(c);
                            setEditDownloads(c.max_downloads_per_day ?? 3);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Code Dialog */}
      <Dialog open={!!editingCode} onOpenChange={(v) => { if (!v) setEditingCode(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Code</DialogTitle>
            <DialogDescription>
              Update settings for code <span className="font-mono">{editingCode?.code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Max downloads per day</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={editDownloads}
                onChange={(e) => setEditDownloads(parseInt(e.target.value) || 3)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCode(null)}>Cancel</Button>
            <Button
              onClick={() => updateMut.mutate({ codeId: editingCode.id, maxDownloadsPerDay: editDownloads })}
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
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
      qc.invalidateQueries({ queryKey: ["branding"] });
    },
  });
  const uploadMut = useMutation({
    mutationFn: (vars: { fileName: string; fileBase64: string; contentType: string }) =>
      uploadSettingFile({ data: vars }),
    onSuccess: (res) => {
      toast.success("File uploaded");
      return res.url;
    },
    onError: (e: any) => toast.error(e?.message),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const getVal = (key: string) =>
    form[key] ?? settings?.find((s: any) => s.key === key)?.value ?? "";

  const handleFileUpload = async (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await uploadMut.mutateAsync({ fileName: file.name, fileBase64: base64, contentType: file.type });
        setForm((f) => ({ ...f, [key]: res.url }));
        await upsertMut.mutateAsync({ key, value: res.url, description: `Uploaded ${file.name}` });
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-8">Loading settings…</div>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-brand">Branding</p>
        <h2 className="text-xl font-semibold">Appearance</h2>
      </div>

      {/* App Name */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">App Name</p>
          <p className="text-xs text-muted-foreground">Display name shown in the navbar, PWA manifest, and browser tab.</p>
        </div>
        <div className="flex gap-3">
          <Input placeholder="Watch Box" value={getVal("app_name")} onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "app_name", value: getVal("app_name") })} disabled={upsertMut.isPending || !getVal("app_name")}>Save</Button>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Logo</p>
          <p className="text-xs text-muted-foreground">Upload a logo image or paste a URL. This replaces the default gradient letter in the navbar.</p>
        </div>
        {getVal("app_logo_url") && (
          <div className="flex items-center gap-3">
            <img src={getVal("app_logo_url")} alt="Logo preview" className="h-12 w-12 rounded-xl object-contain bg-white/5" />
            <Button variant="ghost" size="sm" onClick={() => { setForm((f) => ({ ...f, app_logo_url: "" })); upsertMut.mutate({ key: "app_logo_url", value: "" }); }}>Remove</Button>
          </div>
        )}
        <div className="flex gap-3">
          <Input placeholder="https://example.com/logo.png" value={getVal("app_logo_url")} onChange={(e) => setForm((f) => ({ ...f, app_logo_url: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "app_logo_url", value: getVal("app_logo_url") })} disabled={upsertMut.isPending || !getVal("app_logo_url")}>Save URL</Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="h-9 px-4 rounded-full border border-white/10 bg-white/5 text-sm flex items-center gap-2 cursor-pointer hover:bg-white/10 transition">
            <span>Upload file</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload("app_logo_url", e.target.files[0])} />
          </label>
          <span className="text-xs text-muted-foreground">PNG, SVG, or JPG</span>
        </div>
      </div>

      {/* Favicon */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Favicon</p>
          <p className="text-xs text-muted-foreground">Small icon shown in browser tabs. Recommended: 32x32 or 64x64 PNG.</p>
        </div>
        {getVal("app_favicon_url") && (
          <div className="flex items-center gap-3">
            <img src={getVal("app_favicon_url")} alt="Favicon preview" className="h-8 w-8 rounded object-contain bg-white/5" />
            <Button variant="ghost" size="sm" onClick={() => { setForm((f) => ({ ...f, app_favicon_url: "" })); upsertMut.mutate({ key: "app_favicon_url", value: "" }); }}>Remove</Button>
          </div>
        )}
        <div className="flex gap-3">
          <Input placeholder="https://example.com/favicon.png" value={getVal("app_favicon_url")} onChange={(e) => setForm((f) => ({ ...f, app_favicon_url: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "app_favicon_url", value: getVal("app_favicon_url") })} disabled={upsertMut.isPending || !getVal("app_favicon_url")}>Save URL</Button>
        </div>
        <div className="flex items-center gap-3">
          <label className="h-9 px-4 rounded-full border border-white/10 bg-white/5 text-sm flex items-center gap-2 cursor-pointer hover:bg-white/10 transition">
            <span>Upload file</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload("app_favicon_url", e.target.files[0])} />
          </label>
          <span className="text-xs text-muted-foreground">PNG or ICO</span>
        </div>
      </div>

      {/* Logo Display Mode */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Logo Display</p>
          <p className="text-xs text-muted-foreground">Choose how the logo appears in the navbar.</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: "both", label: "Logo + Title", desc: "Icon image before the site name text" },
            { value: "logo_only", label: "Logo Only", desc: "Just the icon, no text" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setForm((f) => ({ ...f, app_logo_display: opt.value })); upsertMut.mutate({ key: "app_logo_display", value: opt.value }); }}
              className={`flex-1 rounded-xl border p-3 text-left text-sm transition ${getVal("app_logo_display") === opt.value ? "border-brand bg-brand/10" : "border-white/10 hover:bg-white/5"}`}
            >
              <p className="font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tagline */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Tagline</p>
          <p className="text-xs text-muted-foreground">Short tagline shown under the app name.</p>
        </div>
        <div className="flex gap-3">
          <Input placeholder="Cinema, streamed." value={getVal("app_tagline")} onChange={(e) => setForm((f) => ({ ...f, app_tagline: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "app_tagline", value: getVal("app_tagline") })} disabled={upsertMut.isPending || !getVal("app_tagline")}>Save</Button>
        </div>
      </div>

      <div className="border-t border-white/5 pt-6">
        <p className="text-xs uppercase tracking-[0.25em] text-brand">API Keys</p>
        <h2 className="text-xl font-semibold mt-2">Integrations</h2>
      </div>

      {/* TMDB API Key */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">TMDB API Key</p>
          <p className="text-xs text-muted-foreground">v4 Read Access Token for importing titles from The Movie Database.</p>
        </div>
        <div className="flex gap-3">
          <Input type="password" placeholder="eyJhbGciOiJIUzI1NiJ9..." value={getVal("tmdb_api_key")} onChange={(e) => setForm((f) => ({ ...f, tmdb_api_key: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "tmdb_api_key", value: getVal("tmdb_api_key") })} disabled={upsertMut.isPending || !getVal("tmdb_api_key")}>Save</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You can also set <code className="bg-white/5 px-1.5 py-0.5 rounded">TMDB_ACCESS_TOKEN</code> as an environment variable as a fallback.
        </p>
      </div>

      <div className="border-t border-white/5 pt-6">
        <p className="text-xs uppercase tracking-[0.25em] text-brand">Support</p>
        <h2 className="text-xl font-semibold mt-2">Community Channels</h2>
      </div>

      {/* Telegram */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Telegram Channel URL</p>
          <p className="text-xs text-muted-foreground">Link shown on the floating Telegram button.</p>
        </div>
        <div className="flex gap-3">
          <Input placeholder="https://t.me/yourchannel" value={getVal("telegram_url")} onChange={(e) => setForm((f) => ({ ...f, telegram_url: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "telegram_url", value: getVal("telegram_url") })} disabled={upsertMut.isPending || !getVal("telegram_url")}>Save</Button>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">WhatsApp Channel URL</p>
          <p className="text-xs text-muted-foreground">Link shown on the floating WhatsApp button.</p>
        </div>
        <div className="flex gap-3">
          <Input placeholder="https://chat.whatsapp.com/..." value={getVal("whatsapp_url")} onChange={(e) => setForm((f) => ({ ...f, whatsapp_url: e.target.value }))} className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "whatsapp_url", value: getVal("whatsapp_url") })} disabled={upsertMut.isPending || !getVal("whatsapp_url")}>Save</Button>
        </div>
      </div>

      <div className="border-t border-white/5 pt-6">
        <p className="text-xs uppercase tracking-[0.25em] text-brand">Payments</p>
        <h2 className="text-xl font-semibold mt-2">Subscription Pricing</h2>
      </div>

      {/* PawaPay Price */}
      <div className="rounded-2xl border border-white/5 glass p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">PawaPay Price (amount per 30 days)</p>
          <p className="text-xs text-muted-foreground">Amount charged for mobile money payments. Used for all countries (UGX, TZS, NGN, KES, RWF).</p>
        </div>
        <div className="flex gap-3">
          <Input type="number" min={1} placeholder="500" value={getVal("pawapay_price")} onChange={(e) => setForm((f) => ({ ...f, pawapay_price: e.target.value }))} className="w-32" />
          <Button variant="outline" size="sm" onClick={() => upsertMut.mutate({ key: "pawapay_price", value: getVal("pawapay_price") })} disabled={upsertMut.isPending || !getVal("pawapay_price")}>Save</Button>
        </div>
        <p className="text-xs text-muted-foreground">Current: {getVal("pawapay_price") || "500"} (default: 500)</p>
      </div>
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
