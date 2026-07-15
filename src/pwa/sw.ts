/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { NavigationRoute } from "workbox-routing";
import { CACHE_NAMES } from "./constants";

declare const self: any;

const SENSITIVE_PATHS = ["/auth/", "/stripe/", "/admin/", "webhook"];

function isSensitiveUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  return SENSITIVE_PATHS.some((s) => path.includes(s));
}

// ---- Navigation Preload ----

async function enableNavigationPreload() {
  if ("navigationPreload" in self.registration) {
    await self.registration.navigationPreload.enable();
  }
}

self.addEventListener("activate", (event: any) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      enableNavigationPreload(),
    ]),
  );
});

// ---- Precache ----

precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

// ---- Static assets (CacheFirst) ----

registerRoute(
  ({ request }: any) => request.destination === "style" || request.destination === "script" || request.destination === "worker",
  new CacheFirst({
    cacheName: CACHE_NAMES.PUBLIC_STATIC,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ---- Fonts (CacheFirst) ----

registerRoute(
  ({ url }: any) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: CACHE_NAMES.PUBLIC_FONTS,
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ---- TMDB images (StaleWhileRevalidate) ----

registerRoute(
  ({ url }: any) => url.hostname === "image.tmdb.org",
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.PUBLIC_TMDB,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ---- Supabase API (NetworkFirst, skip sensitive) ----

registerRoute(
  ({ url }: any) => {
    if (!url.hostname.includes("supabase.co")) return false;
    if (isSensitiveUrl(url)) return false;
    return url.pathname.includes("/rest/v1/") || url.pathname.includes("/storage/v1/");
  },
  new NetworkFirst({
    cacheName: CACHE_NAMES.SUPABASE_API,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ---- Navigation (NetworkFirst with preload) ----

const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: CACHE_NAMES.PUBLIC_STATIC,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);
registerRoute(navigationRoute);

// ---- Offline fallback ----

setCatchHandler(async ({ event }: any) => {
  if (event?.request?.destination === "document") {
    const cached = await caches.match("/offline.html");
    if (cached) return cached;
  }
  return Response.error();
});

// ---- Skip waiting ----

self.addEventListener("message", (event: any) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---- Cleanup user caches on logout ----

self.addEventListener("message", (event: any) => {
  if (event.data?.type === "CLEAR_USER_CACHES") {
    const userId = event.data.payload?.userId;
    event.waitUntil(
      caches.keys().then((keys: string[]) => {
        return Promise.all(
          keys
            .filter((key) => key.includes(`auth-api-${userId}`) || key.includes(`auth-library-${userId}`))
            .map((key) => caches.delete(key)),
        );
      }),
    );
  }
});
