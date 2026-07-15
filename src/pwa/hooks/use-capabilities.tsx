import { useState, useEffect } from "react";
import { getCapabilities } from "@/pwa/services/capabilities";
import type { DeviceCapabilities } from "@/pwa/types";

export function useCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState(getCapabilities);

  useEffect(() => {
    setCapabilities(getCapabilities());
  }, []);

  return capabilities;
}
