import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "movie" | "tv";

export type LibraryRow = {
  id: string;
  media_id: string;
  media_kind: MediaKind;
  added_at: string;
};

export type HistoryRow = {
  id: string;
  media_id: string;
  media_kind: MediaKind;
  season: number | null;
  episode: number | null;
  progress_seconds: number;
  duration_seconds: number;
  watched_at: string;
};

export type ContinueRow = {
  id: string;
  media_id: string;
  media_kind: MediaKind;
  season: number | null;
  episode: number | null;
  progress_seconds: number;
  duration_seconds: number;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  theme: string;
  autoplay: boolean;
  autoplay_previews: boolean;
  language: string;
  quality: string;
  mature_content: boolean;
  notifications_enabled: boolean;
  email_notifications: boolean;
};

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  backdrop_url: string | null;
  bio: string | null;
};

// ---------- Watchlist ----------
export async function listWatchlist(): Promise<LibraryRow[]> {
  const { data, error } = await supabase.from("watchlist").select("*").order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryRow[];
}
export async function addToWatchlist(userId: string, media_id: string, media_kind: MediaKind) {
  const { error } = await supabase.from("watchlist").insert({ user_id: userId, media_id, media_kind });
  if (error && error.code !== "23505") throw error;
}
export async function removeFromWatchlist(media_id: string) {
  const { error } = await supabase.from("watchlist").delete().eq("media_id", media_id);
  if (error) throw error;
}

// ---------- Favorites ----------
export async function listFavorites(): Promise<LibraryRow[]> {
  const { data, error } = await supabase.from("favorites").select("*").order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryRow[];
}
export async function addToFavorites(userId: string, media_id: string, media_kind: MediaKind) {
  const { error } = await supabase.from("favorites").insert({ user_id: userId, media_id, media_kind });
  if (error && error.code !== "23505") throw error;
}
export async function removeFromFavorites(media_id: string) {
  const { error } = await supabase.from("favorites").delete().eq("media_id", media_id);
  if (error) throw error;
}

// ---------- Watch history ----------
export async function listHistory(limit = 100): Promise<HistoryRow[]> {
  const { data, error } = await supabase
    .from("watch_history")
    .select("*")
    .order("watched_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HistoryRow[];
}
export async function logHistory(
  userId: string,
  entry: { media_id: string; media_kind: MediaKind; season?: number; episode?: number; progress_seconds: number; duration_seconds: number },
) {
  const { error } = await supabase.from("watch_history").insert({ user_id: userId, ...entry });
  if (error) throw error;
}
export async function clearHistory() {
  const { error } = await supabase.from("watch_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

// ---------- Continue watching ----------
export async function listContinueWatching(): Promise<ContinueRow[]> {
  const { data, error } = await supabase
    .from("continue_watching")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ContinueRow[];
}
export async function upsertContinueWatching(
  userId: string,
  entry: { media_id: string; media_kind: MediaKind; season?: number; episode?: number; progress_seconds: number; duration_seconds: number },
) {
  const { error } = await supabase
    .from("continue_watching")
    .upsert({ user_id: userId, ...entry }, { onConflict: "user_id,media_id" });
  if (error) throw error;
}
export async function removeContinueWatching(media_id: string) {
  const { error } = await supabase.from("continue_watching").delete().eq("media_id", media_id);
  if (error) throw error;
}

// ---------- Notifications ----------
export async function listNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}
export async function markNotificationRead(id: string, read = true) {
  const { error } = await supabase.from("notifications").update({ read }).eq("id", id);
  if (error) throw error;
}
export async function markAllNotificationsRead() {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) throw error;
}

// ---------- Profile ----------
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}
export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

// ---------- Settings ----------
export async function getSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as UserSettings) ?? null;
}
export async function updateSettings(userId: string, patch: Partial<UserSettings>) {
  const { error } = await supabase.from("user_settings").update(patch).eq("user_id", userId);
  if (error) throw error;
}