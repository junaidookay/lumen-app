import { useState, useEffect } from "react";

export type NetworkStatus = "online" | "offline" | "syncing";

export function useNetwork() {
  const [status, setStatus] = useState<NetworkStatus>("online");

  useEffect(() => {
    const update = () => setStatus(navigator.onLine ? "online" : "offline");

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const setSyncing = () => setStatus("syncing");
  const setOnline = () => setStatus("online");
  const setOffline = () => setStatus("offline");

  return { status, isOnline: status === "online", isOffline: status === "offline", isSyncing: status === "syncing", setSyncing, setOnline, setOffline };
}
