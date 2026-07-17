/**
 * Redemption code server functions.
 * Admin generates codes, users redeem them for premium access.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Permissions } from "@/lib/permissions";

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Failed to resolve permissions");
  const roles = (data ?? []).map((r: any) => r.role as string);
  let ok = roles.includes("admin");
  if (!ok) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (profile?.is_admin) {
      ok = true;
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "admin", granted_by: userId },
        { onConflict: "user_id,role" },
      );
    }
  }
  if (!ok) throw new Error("Forbidden");
}

async function writeAudit(userId: string, action: string, meta: Record<string, unknown> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({ actor_id: userId, action, target_type: "redemption_code", meta: meta as any });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ------------------------------------------------------------------
// Admin: Generate codes
// ------------------------------------------------------------------

export const generateRedemptionCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: {
    count: number;
    durationDays: number;
    maxDownloadsPerDay?: number;
    maxRedemptions?: number;
    expiresAt?: string;
  }) =>
    z.object({
      count: z.number().int().min(1).max(100),
      durationDays: z.number().int().min(1).max(365),
      maxDownloadsPerDay: z.number().int().min(1).max(50).default(3),
      maxRedemptions: z.number().int().min(1).max(10000).optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const codes = [];
    for (let i = 0; i < data.count; i++) {
      let code = generateCode();
      // Ensure uniqueness (retry up to 5 times)
      for (let attempt = 0; attempt < 5; attempt++) {
        const { count } = await supabaseAdmin.from("redemption_codes").select("id", { count: "exact", head: true }).eq("code", code);
        if ((count ?? 0) === 0) break;
        code = generateCode();
      }
      codes.push({
        code,
        created_by: context.userId,
        duration_days: data.durationDays,
        max_downloads_per_day: data.maxDownloadsPerDay,
        max_redemptions: data.maxRedemptions ?? null,
        expires_at: data.expiresAt ?? null,
        is_active: true,
      });
    }

    const { data: inserted, error } = await supabaseAdmin.from("redemption_codes").insert(codes).select("*");
    if (error) throw new Error(error.message);

    await writeAudit(context.userId, "codes.generate", { count: codes.length, duration_days: data.durationDays });

    return { codes: inserted ?? [] };
  });

// ------------------------------------------------------------------
// Admin: List codes
// ------------------------------------------------------------------

export const listRedemptionCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("redemption_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// ------------------------------------------------------------------
// Admin: Toggle code active
// ------------------------------------------------------------------

export const toggleRedemptionCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { codeId: string; isActive: boolean }) =>
    z.object({ codeId: z.string().uuid(), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("redemption_codes").update({ is_active: data.isActive }).eq("id", data.codeId);
    await writeAudit(context.userId, data.isActive ? "code.enable" : "code.disable", { code_id: data.codeId });
    return { ok: true };
  });

// ------------------------------------------------------------------
// User: Redeem a code
// ------------------------------------------------------------------

export const redeemCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { code: string }) =>
    z.object({ code: z.string().min(6).max(12).trim().toUpperCase() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Find the code
    const { data: codeRow, error: codeErr } = await supabaseAdmin
      .from("redemption_codes")
      .select("*")
      .eq("code", data.code)
      .eq("is_active", true)
      .maybeSingle();
    if (codeErr || !codeRow) throw new Error("Invalid or expired code");

    // 2. Check expiry
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      throw new Error("This code has expired");
    }

    // 3. Check max redemptions
    if (codeRow.max_redemptions && codeRow.current_redemptions >= codeRow.max_redemptions) {
      throw new Error("This code has reached its redemption limit");
    }

    // 4. Check if user already redeemed this code
    const { data: existingRedemption } = await supabaseAdmin
      .from("user_code_redemptions")
      .select("id")
      .eq("user_id", context.userId)
      .eq("code_id", codeRow.id)
      .maybeSingle();
    if (existingRedemption) {
      throw new Error("You have already redeemed this code");
    }

    // 5. Record redemption
    const { error: redeemErr } = await supabaseAdmin
      .from("user_code_redemptions")
      .insert({ user_id: context.userId, code_id: codeRow.id });
    if (redeemErr) throw new Error("Failed to redeem code");

    // 6. Increment redemption count
    await supabaseAdmin
      .from("redemption_codes")
      .update({ current_redemptions: (codeRow.current_redemptions ?? 0) + 1 })
      .eq("id", codeRow.id);

    // 7. Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now.getTime() + codeRow.duration_days * 24 * 60 * 60 * 1000);

    // 8. Activate subscription
    const { error: subErr } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: context.userId,
        plan_id: "premium",
        status: "active",
        payment_method: "code",
        code_id: codeRow.id,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        downloads_today: 0,
        downloads_reset_at: now.toISOString(),
        cancel_at_period_end: false,
      },
      { onConflict: "user_id" },
    );
    if (subErr) throw new Error("Failed to activate subscription");

    // 9. Audit
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "code.redeem",
      target_type: "redemption_code",
      target_id: codeRow.id,
      meta: { code: data.code, duration_days: codeRow.duration_days } as any,
    });

    return {
      ok: true,
      durationDays: codeRow.duration_days,
      expiresAt: periodEnd.toISOString(),
      downloadsPerDay: codeRow.max_downloads_per_day,
    };
  });

// ------------------------------------------------------------------
// User: Check download eligibility (for code-based subs)
// ------------------------------------------------------------------

export const checkDownloadEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("payment_method, downloads_today, downloads_reset_at, code_id, plan_id, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!sub || sub.plan_id === "free" || sub.status !== "active") {
      return { allowed: false, remaining: 0, reason: "No active subscription" };
    }

    // Non-code subscriptions get unlimited downloads
    if (sub.payment_method !== "code") {
      return { allowed: true, remaining: 999, reason: "Unlimited (premium)" };
    }

    // Code-based: check daily limit
    const now = new Date();
    const resetAt = sub.downloads_reset_at ? new Date(sub.downloads_reset_at) : null;

    // Reset counter if new day
    if (!resetAt || now.toDateString() !== resetAt.toDateString()) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ downloads_today: 0, downloads_reset_at: now.toISOString() })
        .eq("user_id", context.userId);
      return { allowed: true, remaining: sub.code_id ? 3 : 999, reason: "Daily counter reset" };
    }

    // Get max downloads from code
    const { data: codeRow } = sub.code_id
      ? await supabaseAdmin
          .from("redemption_codes")
          .select("max_downloads_per_day")
          .eq("id", sub.code_id)
          .maybeSingle()
      : { data: null };

    const maxDownloads = codeRow?.max_downloads_per_day ?? 3;
    const remaining = Math.max(0, maxDownloads - (sub.downloads_today ?? 0));

    return {
      allowed: remaining > 0,
      remaining,
      maxDownloads,
      reason: remaining > 0 ? "Downloads available" : "Daily limit reached",
    };
  });

// ------------------------------------------------------------------
// User: Record a download
// ------------------------------------------------------------------

export const recordDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("payment_method, downloads_today, downloads_reset_at, code_id, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!sub || sub.status !== "active") throw new Error("No active subscription");

    if (sub.payment_method !== "code") return { ok: true }; // Unlimited

    const now = new Date();
    const resetAt = sub.downloads_reset_at ? new Date(sub.downloads_reset_at) : null;

    let currentCount = sub.downloads_today ?? 0;
    if (!resetAt || now.toDateString() !== resetAt.toDateString()) {
      currentCount = 0;
    }

    const { data: codeRow } = sub.code_id
      ? await supabaseAdmin
          .from("redemption_codes")
          .select("max_downloads_per_day")
          .eq("id", sub.code_id)
          .maybeSingle()
      : { data: null };

    const maxDownloads = codeRow?.max_downloads_per_day ?? 3;
    if (currentCount >= maxDownloads) throw new Error("Daily download limit reached");

    await supabaseAdmin
      .from("subscriptions")
      .update({ downloads_today: currentCount + 1, downloads_reset_at: now.toISOString() })
      .eq("user_id", context.userId);

    return { ok: true, remaining: maxDownloads - currentCount - 1 };
  });
