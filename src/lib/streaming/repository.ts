import type { PlaybackPreferences, StreamRequest, StreamResolution, StreamingSource } from "./types";
import { listProviders } from "./providers/registry";

function score(source: StreamingSource, prefs?: Partial<PlaybackPreferences>): number {
  let s = 0;
  if (source.default) s += 100;
  if (source.health === "healthy") s += 50;
  else if (source.health === "degraded") s += 10;
  if (prefs?.preferredProvider && source.providerId === prefs.preferredProvider) s += 60;
  if (prefs?.preferredSourceId && source.id === prefs.preferredSourceId) s += 200;
  if (source.container === "hls") s += 5;
  return s;
}

export async function resolveSources(
  req: StreamRequest,
  prefs?: Partial<PlaybackPreferences>,
): Promise<StreamResolution> {
  const providers = listProviders();
  const results = await Promise.allSettled(providers.map((p) => p.list(req)));
  const sources: StreamingSource[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      sources.push(...r.value);
      // Check for attached error marker from RD provider
      const marked = r.value as any;
      if (marked._error) errors.push(marked._error);
    } else {
      errors.push(`Provider failed: ${r.reason}`);
    }
  }
  sources.sort((a, b) => score(b, prefs) - score(a, prefs));
  return {
    sources,
    preferred: sources[0] ?? null,
    providers: providers.map((p) => p.id),
    errors: errors.length > 0 ? errors : undefined,
  };
}