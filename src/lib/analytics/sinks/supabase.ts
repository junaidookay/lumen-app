import { subscribeAnalytics, type AnalyticsEvent } from "../index";

interface SupabaseSinkConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

let config: SupabaseSinkConfig | null = null;

export function configureSupabaseSink(c: SupabaseSinkConfig): void {
  config = c;
}

export function registerSupabaseSink(): () => void {
  return subscribeAnalytics(async (event: AnalyticsEvent) => {
    if (!config) return;

    try {
      await fetch(`${config.supabaseUrl}/rest/v1/analytics_events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name: event.name,
          properties: event.properties,
          timestamp: new Date(event.timestamp).toISOString(),
        }),
      });
    } catch {
      // Analytics must never break the app
    }
  });
}
