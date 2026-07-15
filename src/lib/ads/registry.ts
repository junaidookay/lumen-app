/**
 * Ad provider abstraction. We do not integrate a real network yet —
 * this module lists what a placement should render for every provider.
 * Premium users always bypass ads.
 */
export type AdSlot = "banner_top" | "banner_inline" | "pre_roll" | "mid_roll" | "rewarded";
export type AdProvider = "none" | "house" | "google_ads" | "custom";

export interface AdPlacement {
  slot: AdSlot;
  provider: AdProvider | string;
  is_enabled: boolean;
  config: Record<string, unknown>;
}

export const AD_SLOT_LABELS: Record<AdSlot, string> = {
  banner_top: "Top banner",
  banner_inline: "Inline banner",
  pre_roll: "Pre-roll (video)",
  mid_roll: "Mid-roll (video)",
  rewarded: "Rewarded",
};

export const AD_PROVIDERS: { id: AdProvider; label: string; description: string }[] = [
  { id: "none", label: "None", description: "Slot disabled." },
  { id: "house", label: "House ads", description: "Editorial promos from homepage_config." },
  { id: "google_ads", label: "Google Ads (future)", description: "Reserved — integration not implemented yet." },
  { id: "custom", label: "Custom provider", description: "Arbitrary provider handled by config.script." },
];