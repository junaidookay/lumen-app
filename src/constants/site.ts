export const SITE = {
  name: "Lumen",
  tagline: "Cinema, streamed.",
  description:
    "Lumen is a premium streaming experience for movies and TV — curated collections, cinematic recommendations, and a beautifully quiet interface.",
} as const;

export interface NavLink {
  to: "/" | "/home" | "/discover" | "/search" | "/install" | "/billing";
  label: string;
  exact?: boolean;
}

export const NAV_LINKS: readonly NavLink[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/home", label: "Browse" },
  { to: "/discover", label: "Discover" },
  { to: "/billing", label: "Subscribe" },
  { to: "/install", label: "Install" },
] as const;