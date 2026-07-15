export const CACHE_VERSION = "v1";

export const CACHE_NAMES = {
  PUBLIC_STATIC: `lumen-public-static-${CACHE_VERSION}`,
  PUBLIC_FONTS: `lumen-public-fonts-${CACHE_VERSION}`,
  PUBLIC_TMDB: `lumen-public-tmdb-${CACHE_VERSION}`,
  OFFLINE_PAGE: `lumen-offline-page-${CACHE_VERSION}`,
  AUTH_API: (userId: string) => `lumen-auth-api-${userId}-${CACHE_VERSION}`,
  AUTH_LIBRARY: (userId: string) => `lumen-auth-library-${userId}-${CACHE_VERSION}`,
  SUPABASE_API: `lumen-supabase-api-${CACHE_VERSION}`,
} as const;

export const LEGACY_CACHES = [
  "google-fonts-cache",
  "gstatic-fonts-cache",
  "tmdb-images-cache",
  "lumen-public-static",
  "lumen-public-fonts",
  "lumen-public-tmdb",
] as const;
