export type AnalyticsEventName =
  | "page_view"
  | "search"
  | "playback_start"
  | "playback_complete"
  | "install_start"
  | "install_complete"
  | "signup"
  | "login"
  | "logout"
  | "subscription_change"
  | string;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, unknown>;
  timestamp: number;
}

type AnalyticsSink = (event: AnalyticsEvent) => void;
const sinks: AnalyticsSink[] = [];

export function trackEvent(name: AnalyticsEventName, properties?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };

  for (const sink of sinks) {
    try {
      sink(event);
    } catch {
      // Analytics must never break the app
    }
  }
}

export function subscribeAnalytics(sink: AnalyticsSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}
