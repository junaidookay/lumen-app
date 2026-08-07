export const CACHE_VERSION = "v2";

export const CACHE_NAMES = {
  PUBLIC_STATIC: `watchbox-public-static-${CACHE_VERSION}`,
  PUBLIC_FONTS: `watchbox-public-fonts-${CACHE_VERSION}`,
  PUBLIC_TMDB: `watchbox-public-tmdb-${CACHE_VERSION}`,
  OFFLINE_PAGE: `watchbox-offline-page-${CACHE_VERSION}`,
  AUTH_API: (userId: string) => `watchbox-auth-api-${userId}-${CACHE_VERSION}`,
  AUTH_LIBRARY: (userId: string) => `watchbox-auth-library-${userId}-${CACHE_VERSION}`,
  SUPABASE_API: `watchbox-supabase-api-${CACHE_VERSION}`,
} as const;

export const LEGACY_CACHES = [
  "google-fonts-cache",
  "gstatic-fonts-cache",
  "tmdb-images-cache",
  "lumen-public-static",
  "lumen-public-static-v1",
  "lumen-public-fonts",
  "lumen-public-fonts-v1",
  "lumen-public-tmdb",
  "lumen-public-tmdb-v1",
  "lumen-offline-page-v1",
  "lumen-supabase-api-v1",
  "lumen-google-fonts",
  "lumen-gstatic-fonts",
  "lumen-tmdb-images",
  "lumen-supabase-api",
] as const;
