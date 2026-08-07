import { defineEventHandler, getQuery, setResponseHeader } from "h3";

/**
 * Proxies DASH MPD manifests and segment requests from RD streaming URLs.
 *
 * RD streaming URLs (from /streaming/transcode) are IP-locked to the IP that
 * requested them. When the server fetches the MPD, segment URLs are locked to
 * the server's IP. The browser can't fetch them directly.
 *
 * This proxy fetches the content from RD using the server's IP and returns it
 * to the browser, bypassing the IP lock.
 *
 * Usage: /api/dash-proxy?url=<encoded-rd-url>
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const targetUrl = query.url as string;

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return new Response("Bad request: url parameter required", { status: 400 });
  }

  // Only allow RD streaming URLs
  if (!targetUrl.includes("real-debrid.com") && !targetUrl.includes("rd-streaming.com")) {
    return new Response("Bad request: only RD streaming URLs allowed", { status: 403 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
    });

    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const body = await res.text();

    // If it's an MPD manifest, rewrite all URLs to go through this proxy
    if (contentType.includes("xml") || targetUrl.includes(".mpd") || body.includes("<MPD")) {
      const baseOrigin = new URL(targetUrl).origin;
      const basePath = new URL(targetUrl).pathname.replace(/\/[^/]*$/, "/");

      const proxyBase = "/api/dash-proxy?url=";

      const toProxy = (absoluteUrl: string) => `${proxyBase}${encodeURIComponent(absoluteUrl)}`;

      const resolveUrl = (url: string) => {
        if (url.startsWith("http")) return url;
        if (url.startsWith("//")) return `https:${url}`;
        if (url.startsWith("/")) return `${baseOrigin}${url}`;
        return `${baseOrigin}${basePath}${url}`;
      };

      // Rewrite <BaseURL> and all segment references to route through proxy
      const rewritten = body
        // Rewrite <BaseURL>content</BaseURL> — make absolute, wrap in proxy
        .replace(
          /<BaseURL>([^<]+)<\/BaseURL>/g,
          (_, url) => {
            const absolute = resolveUrl(url);
            return `<BaseURL>${toProxy(absolute)}</BaseURL>`;
          },
        )
        // Rewrite segment URLs in attributes (media=, url=, etc.)
        .replace(
          /(media|url|initialization|range|BitstreamSwitchUrl)\s*=\s*["']([^"']*?)["']/gi,
          (match, attr, segPath) => {
            if (segPath.startsWith("http") || segPath.startsWith("/api/")) return match;
            const absolute = resolveUrl(segPath);
            return `${attr}="${toProxy(absolute)}"`;
          },
        )
        // Rewrite segment URLs in text nodes (.m4s, .m4v, .mp4, .cmfv, .cmfa, .webm)
        .replace(
          /(["'>])([^"']*?\.(?:m4s|m4v|mp4|cmfv|cmfa|webm|m4a))\1/gi,
          (match, quote, segPath) => {
            if (segPath.startsWith("http") || segPath.startsWith("/api/")) return match;
            const absolute = resolveUrl(segPath);
            return `${quote}${toProxy(absolute)}${quote}`;
          },
        );

      setResponseHeader(event, "content-type", "application/dash+xml");
      setResponseHeader(event, "access-control-allow-origin", "*");
      setResponseHeader(event, "cache-control", "no-cache");

      return new Response(rewritten, {
        headers: {
          "content-type": "application/dash+xml",
          "access-control-allow-origin": "*",
          "cache-control": "no-cache",
        },
      });
    }

    // For non-MPD responses (segments, etc.), stream directly
    setResponseHeader(event, "content-type", contentType);
    setResponseHeader(event, "access-control-allow-origin", "*");

    return new Response(res.body, {
      headers: {
        "content-type": contentType,
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`Proxy error: ${(e as Error).message}`, { status: 502 });
  }
});
