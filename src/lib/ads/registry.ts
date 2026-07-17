/**
 * Ad provider abstraction.
 * Adsterra is the primary ad network. Premium users always bypass ads.
 */
export type AdSlot = "social_bar" | "banner_top" | "banner_inline" | "interstitial" | "popunder";
export type AdProvider = "none" | "house" | "adsterra";

export interface AdPlacement {
  slot: AdSlot;
  provider: AdProvider | string;
  is_enabled: boolean;
  config: Record<string, unknown>;
}

export const AD_SLOT_LABELS: Record<AdSlot, string> = {
  social_bar: "Social Bar (bottom)",
  banner_top: "Top Banner",
  banner_inline: "Inline Banner",
  interstitial: "Interstitial (pre-play)",
  popunder: "Pop-under (first visit)",
};

export const AD_PROVIDERS: { id: AdProvider; label: string; description: string }[] = [
  { id: "none", label: "None", description: "Slot disabled." },
  { id: "house", label: "House ads", description: "Editorial promos from homepage_config." },
  { id: "adsterra", label: "Adsterra", description: "Social bar, popunder, banners, interstitials." },
];