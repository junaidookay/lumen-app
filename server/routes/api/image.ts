import { defineEventHandler, getQuery, setResponseHeader } from "h3";

const TMDB_BASE = "https://image.tmdb.org/t/p";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const path = query.path as string;

  if (!path || !path.startsWith("/")) {
    return new Response("Bad request: path required", { status: 400 });
  }

  const url = `${TMDB_BASE}${path}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "WatchBox/1.0" },
  });

  if (!res.ok) {
    return new Response("Upstream error", { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const cacheControl = "public, max-age=604800, stale-while-revalidate=86400";

  setResponseHeader(event, "content-type", contentType);
  setResponseHeader(event, "cache-control", cacheControl);
  setResponseHeader(event, "access-control-allow-origin", "*");

  return new Response(res.body, {
    headers: {
      "content-type": contentType,
      "cache-control": cacheControl,
      "access-control-allow-origin": "*",
    },
  });
});
