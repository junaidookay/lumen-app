/**
 * Admin & permissions server functions.
 * All privileged reads/writes go through here — the UI never talks to
 * Supabase directly for admin work. Auth is enforced via requireSupabaseAuth
 * and an explicit role check inside each handler.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Permissions } from "@/lib/permissions";

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

async function ensureAdmin(supabase: any, userId: string, role: "moderator" | "admin" = "moderator") {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Failed to resolve permissions");
  const roles = (data ?? []).map((r: any) => r.role as string);
  const ok = role === "admin" ? roles.includes("admin") : roles.includes("admin") || roles.includes("moderator");
  if (!ok) throw new Error("Forbidden");
  return roles;
}

async function writeAudit(userId: string, action: string, targetType: string | null, targetId: string | null, meta: Record<string, unknown> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({ actor_id: userId, action, target_type: targetType, target_id: targetId, meta: meta as any });
}

// ------------------------------------------------------------------
// permissions for the current user (called by every page that gates UI)
// ------------------------------------------------------------------

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Permissions> => {
    const { supabase, userId } = context;
    const [rolesRes, subRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("subscriptions").select("plan_id,status,cancel_at_period_end").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle(),
    ]);
    let roles = (rolesRes.data ?? []).map((r: any) => r.role);

    // Also treat profiles.is_admin as admin
    if (profileRes.data?.is_admin && !roles.includes("admin")) {
      roles = ["admin", ...roles];
    }

    // Self-bootstrap: if no admin exists yet, promote the first user who hits this
    if (!roles.includes("admin")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) === 0) {
        await Promise.all([
          supabaseAdmin.from("user_roles").upsert(
            { user_id: userId, role: "admin", granted_by: userId },
            { onConflict: "user_id,role" },
          ),
          supabaseAdmin.from("profiles").update({ is_admin: true }).eq("id", userId),
        ]);
        roles = ["admin", ...roles];
      }
    }

    return {
      roles: roles.length ? roles : ["user"],
      plan: (subRes.data?.plan_id ?? "free") as any,
      subscription_status: (subRes.data?.status ?? null) as any,
      cancel_at_period_end: !!subRes.data?.cancel_at_period_end,
    };
  });

// ------------------------------------------------------------------
// platform overview
// ------------------------------------------------------------------

export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [{ count: totalUsers }, { count: newUsers30 }, { count: premiumUsers }, { count: reportsOpen }, { count: watchEvents30 }, paymentRow] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
        supabaseAdmin.from("subscriptions").select("id", { count: "exact", head: true }).eq("plan_id", "premium").in("status", ["active", "trialing"]),
        supabaseAdmin.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabaseAdmin.from("watch_history").select("id", { count: "exact", head: true }).gte("watched_at", since30),
        supabaseAdmin.from("payment_history").select("amount_cents,currency,paid_at").eq("status", "paid").gte("paid_at", since30),
      ]);

    const revenueCents30 = (paymentRow.data ?? []).reduce((a: number, r: any) => a + (r.amount_cents ?? 0), 0);

    // daily active last 7 days (rough — distinct users in watch_history)
    const { data: recentUsers } = await supabaseAdmin.from("watch_history").select("user_id,watched_at").gte("watched_at", since7);
    const activeUsers7 = new Set((recentUsers ?? []).map((r: any) => r.user_id)).size;

    return {
      totalUsers: totalUsers ?? 0,
      newUsers30: newUsers30 ?? 0,
      premiumUsers: premiumUsers ?? 0,
      activeUsers7,
      reportsOpen: reportsOpen ?? 0,
      watchEvents30: watchEvents30 ?? 0,
      revenueCents30,
    };
  });

export const getGrowthSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 29 * 86400_000);
    const { data } = await supabaseAdmin.from("profiles").select("created_at").gte("created_at", since.toISOString());
    const buckets: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(since.getTime() + i * 86400_000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const row of data ?? []) {
      const day = String(row.created_at).slice(0, 10);
      if (day in buckets) buckets[day]++;
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  });

// ------------------------------------------------------------------
// user management
// ------------------------------------------------------------------

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { q?: string; page?: number; pageSize?: number }) => z.object({ q: z.string().optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(25) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, avatar_url, status, is_admin, email, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.q) q = q.or(`display_name.ilike.%${data.q}%,username.ilike.%${data.q}%,email.ilike.%${data.q}%`);
    const { data: profiles, count } = await q;

    const ids = (profiles ?? []).map((p: any) => p.id);
    if (!ids.length) return { rows: [], total: count ?? 0 };

    const [{ data: roles }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("subscriptions").select("user_id, plan_id, status").in("user_id", ids),
    ]);

    const rows = (profiles ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
      status: p.status,
      is_admin: p.is_admin,
      created_at: p.created_at,
      email: p.email ?? null,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      plan: (subs ?? []).find((s: any) => s.user_id === p.id)?.plan_id ?? "free",
      sub_status: (subs ?? []).find((s: any) => s.user_id === p.id)?.status ?? null,
    }));

    return { rows, total: count ?? 0 };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; status: "active" | "suspended" | "banned" }) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["active", "suspended", "banned"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ status: data.status }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await writeAudit(context.userId, `user.${data.status}`, "user", data.userId);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; role: "user" | "moderator" | "admin"; grant: boolean }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["user", "moderator", "admin"]), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role, granted_by: context.userId }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    await writeAudit(context.userId, data.grant ? "role.grant" : "role.revoke", "user", data.userId, { role: data.role });
    return { ok: true };
  });

export const toggleUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string; isAdmin: boolean }) =>
    z.object({ userId: z.string().uuid(), isAdmin: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_admin: data.isAdmin }).eq("id", data.userId);
    if (data.isAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin", granted_by: context.userId }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    await writeAudit(context.userId, data.isAdmin ? "admin.grant" : "admin.revoke", "user", data.userId);
    return { ok: true };
  });

export const resetUserData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all([
      supabaseAdmin.from("watch_history").delete().eq("user_id", data.userId),
      supabaseAdmin.from("continue_watching").delete().eq("user_id", data.userId),
      supabaseAdmin.from("favorites").delete().eq("user_id", data.userId),
      supabaseAdmin.from("watchlist").delete().eq("user_id", data.userId),
    ]);
    await writeAudit(context.userId, "user.reset_data", "user", data.userId);
    return { ok: true };
  });

// ------------------------------------------------------------------
// moderation
// ------------------------------------------------------------------

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; status: "reviewing" | "resolved" | "dismissed" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["reviewing", "resolved", "dismissed"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { status: data.status };
    if (data.status !== "reviewing") { patch.resolved_by = context.userId; patch.resolved_at = new Date().toISOString(); }
    await supabaseAdmin.from("user_reports").update(patch).eq("id", data.id);
    await writeAudit(context.userId, `report.${data.status}`, "report", data.id);
    return { ok: true };
  });

// ------------------------------------------------------------------
// broadcasts
// ------------------------------------------------------------------

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("broadcast_notifications").select("*").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { title: string; body?: string; kind?: "announcement" | "maintenance" | "promo" | "system"; link?: string }) =>
    z.object({
      title: z.string().trim().min(1).max(200),
      body: z.string().trim().max(2000).optional(),
      kind: z.enum(["announcement", "maintenance", "promo", "system"]).default("announcement"),
      link: z.string().url().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date().toISOString();
    const { data: broadcast, error } = await supabaseAdmin
      .from("broadcast_notifications")
      .insert({ title: data.title, body: data.body ?? null, kind: data.kind, link: data.link ?? null, sent_at: now, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Fan out to every user's inbox.
    const { data: users } = await supabaseAdmin.from("profiles").select("id");
    if (users?.length) {
      const rows = users.map((u: any) => ({
        user_id: u.id, title: data.title, body: data.body ?? null, kind: data.kind, link: data.link ?? null,
      }));
      // insert in chunks to avoid oversized payloads
      for (let i = 0; i < rows.length; i += 500) {
        await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 500));
      }
    }
    await writeAudit(context.userId, "broadcast.sent", "broadcast", broadcast.id, { kind: data.kind, recipients: users?.length ?? 0 });
    return broadcast;
  });

// ------------------------------------------------------------------
// homepage config
// ------------------------------------------------------------------

export const getHomepageConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("homepage_config").select("*").eq("id", 1).maybeSingle();
  return data;
});

export const updateHomepageConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { hero_media_ids?: unknown; featured_rows?: unknown; featured_collections?: unknown; announcement?: string | null }) =>
    z.object({
      hero_media_ids: z.array(z.any()).optional(),
      featured_rows: z.array(z.any()).optional(),
      featured_collections: z.array(z.any()).optional(),
      announcement: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { updated_by: context.userId };
    if (data.hero_media_ids) patch.hero_media_ids = data.hero_media_ids;
    if (data.featured_rows) patch.featured_rows = data.featured_rows;
    if (data.featured_collections) patch.featured_collections = data.featured_collections;
    if ("announcement" in data) patch.announcement = data.announcement;
    await supabaseAdmin.from("homepage_config").update(patch).eq("id", 1);
    await writeAudit(context.userId, "homepage.update", "homepage", "1", patch);
    return { ok: true };
  });

// ------------------------------------------------------------------
// ads
// ------------------------------------------------------------------

export const listAdPlacements = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("ad_placements").select("*").order("slot");
  return data ?? [];
});

export const updateAdPlacement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { slot: string; provider?: string; is_enabled?: boolean; config?: Record<string, unknown> }) =>
    z.object({
      slot: z.string(),
      provider: z.string().optional(),
      is_enabled: z.boolean().optional(),
      config: z.record(z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.provider !== undefined) patch.provider = data.provider;
    if (data.is_enabled !== undefined) patch.is_enabled = data.is_enabled;
    if (data.config !== undefined) patch.config = data.config;
    await supabaseAdmin.from("ad_placements").update(patch).eq("slot", data.slot);
    await writeAudit(context.userId, "ad.update", "ad_placement", data.slot, patch);
    return { ok: true };
  });

// ------------------------------------------------------------------
// audit
// ------------------------------------------------------------------

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId, "admin");
    const { data } = await context.supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });