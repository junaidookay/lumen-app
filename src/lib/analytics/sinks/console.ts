import { subscribeAnalytics } from "../index";

export function registerConsoleSink(): () => void {
  return subscribeAnalytics((event) => {
    console.debug("[analytics]", event.name, event.properties);
  });
}
