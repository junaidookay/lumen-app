import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (roles.includes("admin")) return roles;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_admin) return roles;
  throw new Error("Forbidden");
}

// ---- Get all settings (admin only) ----

export const listSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("settings")
      .select("key, value, description, updated_at")
      .order("key");
    return data ?? [];
  });

// ---- Get a single setting (admin only) ----

export const getSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { key: string }) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any)
      .from("settings")
      .select("value")
      .eq("key", data.key)
      .maybeSingle();
    return row?.value ?? null;
  });

// ---- Upsert a setting (admin only) ----

export const upsertSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { key: string; value: string; description?: string }) =>
    z.object({ key: z.string(), value: z.string(), description: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("settings").upsert(
      {
        key: data.key,
        value: data.value,
        description: data.description ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    return { ok: true };
  });

// ---- Get TMDB API key (server-side helper, no auth needed) ----

export async function getTmdbApiKey(): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("settings")
      .select("value")
      .eq("key", "tmdb_api_key")
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

// ---- Get branding settings (public, no auth needed) ----

export const getBranding = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("settings")
      .select("key, value")
      .in("key", ["app_name", "app_tagline", "app_logo_url", "telegram_url", "whatsapp_url"]);
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return {
      name: map.app_name || "Lumen",
      tagline: map.app_tagline || "Cinema, streamed.",
      logoUrl: map.app_logo_url || "",
      telegramUrl: map.telegram_url || "",
      whatsappUrl: map.whatsapp_url || "",
    };
  } catch {
    return { name: "Lumen", tagline: "Cinema, streamed.", logoUrl: "", telegramUrl: "", whatsappUrl: "" };
  }
});
