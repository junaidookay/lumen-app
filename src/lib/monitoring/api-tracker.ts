interface ApiMetric {
  name: string;
  url: string;
  method: string;
  status: number;
  durationMs: number;
  timestamp: number;
  success: boolean;
}

type MetricSink = (metric: ApiMetric) => void;
const sinks: MetricSink[] = [];
const metrics: ApiMetric[] = [];
const MAX_METRICS = 200;

export function trackApiCall(
  name: string,
  url: string,
  method: string,
  status: number,
  durationMs: number,
): void {
  const metric: ApiMetric = {
    name,
    url,
    method,
    status,
    durationMs,
    timestamp: Date.now(),
    success: status >= 200 && status < 400,
  };

  metrics.push(metric);
  if (metrics.length > MAX_METRICS) metrics.shift();

  for (const sink of sinks) {
    try {
      sink(metric);
    } catch {
      // Monitoring must never break the app
    }
  }
}

export function subscribeMetrics(sink: MetricSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

export function getRecentMetrics(): ApiMetric[] {
  return [...metrics];
}

export function getMetricsSummary(): Record<string, { count: number; avgMs: number; errorRate: number }> {
  const byName = new Map<string, ApiMetric[]>();
  for (const m of metrics) {
    const arr = byName.get(m.name) ?? [];
    arr.push(m);
    byName.set(m.name, arr);
  }

  const summary: Record<string, { count: number; avgMs: number; errorRate: number }> = {};
  for (const [name, arr] of byName) {
    const total = arr.length;
    const avgMs = arr.reduce((sum, m) => sum + m.durationMs, 0) / total;
    const errors = arr.filter((m) => !m.success).length;
    summary[name] = {
      count: total,
      avgMs: Math.round(avgMs),
      errorRate: Math.round((errors / total) * 100),
    };
  }
  return summary;
}

// Console sink for dev
subscribeMetrics((m) => {
  if (!m.success) {
    console.warn(`[api:${m.name}] ${m.method} ${m.status} ${m.durationMs}ms`);
  }
});
