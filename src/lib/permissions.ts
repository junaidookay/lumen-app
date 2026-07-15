/**
 * Permission utilities — pure, side-effect free, safe on client and server.
 * Feature-gate every premium capability through the helpers below rather
 * than sprinkling role/plan checks throughout components.
 */

export type AppRole = "user" | "moderator" | "admin";
export type PlanId = "free" | "premium" | (string & {});
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "paused"
  | null;

export interface Permissions {
  roles: AppRole[];
  plan: PlanId;
  subscription_status: SubscriptionStatus;
  cancel_at_period_end: boolean;
}

export const EMPTY_PERMISSIONS: Permissions = {
  roles: ["user"],
  plan: "free",
  subscription_status: null,
  cancel_at_period_end: false,
};

export function hasRole(p: Permissions | null | undefined, role: AppRole): boolean {
  return !!p?.roles.includes(role);
}

export function isAdmin(p: Permissions | null | undefined): boolean {
  return hasRole(p, "admin");
}

export function isModerator(p: Permissions | null | undefined): boolean {
  return hasRole(p, "moderator") || isAdmin(p);
}

export function isPremium(p: Permissions | null | undefined): boolean {
  if (!p) return false;
  if (p.plan === "free") return false;
  return p.subscription_status === "active" || p.subscription_status === "trialing";
}

/**
 * Feature-flag registry. Add new capabilities here so gating stays centralized.
 * The value is a predicate over the user's Permissions bundle.
 */
export const FEATURES = {
  "playback.4k": isPremium,
  "playback.hdr": isPremium,
  "playback.downloads": isPremium,
  "playback.no-ads": isPremium,
  "content.exclusive": isPremium,
  "admin.panel": isModerator,
  "admin.manage-users": isAdmin,
  "admin.manage-content": isModerator,
  "admin.moderation": isModerator,
  "admin.audit": isAdmin,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function can(feature: FeatureKey, p: Permissions | null | undefined): boolean {
  return FEATURES[feature](p);
}