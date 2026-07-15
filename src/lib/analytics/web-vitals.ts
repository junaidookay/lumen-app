import { onLCP, onINP, onCLS, onTTFB, onFCP, type Metric } from "web-vitals";

type VitalSink = (metric: Metric) => void;
const sinks: VitalSink[] = [];

function report(metric: Metric): void {
  for (const sink of sinks) {
    try {
      sink(metric);
    } catch {
      // Must never break
    }
  }
}

export function subscribeWebVitals(sink: VitalSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

export function initWebVitals(): void {
  if (typeof window === "undefined") return;

  onLCP(report);
  onINP(report);
  onCLS(report);
  onTTFB(report);
  onFCP(report);
}
