import type { H3Event } from "h3";

const requestCounts = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 100,
};

function getClientIP(event: H3Event): string {
  const forwarded = event.node.req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return event.node.req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(
  event: H3Event,
  config: Partial<RateLimitConfig> = {},
): { limited: boolean; remaining: number } {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };
  const ip = getClientIP(event);
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0 };
  }
  return { limited: false, remaining: maxRequests - entry.count };
}

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestCounts) {
    if (now > entry.resetAt) requestCounts.delete(ip);
  }
}, 60_000);
