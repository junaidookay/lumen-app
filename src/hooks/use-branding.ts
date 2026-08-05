import { useQuery } from "@tanstack/react-query";
import { getBranding } from "@/lib/admin/settings.functions";

/**
 * Returns all branding settings from the settings table.
 * Used for dynamic favicon, title, and logo updates.
 */
export function useBranding() {
  const { data } = useQuery({
    queryKey: ["branding"],
    queryFn: () => getBranding(),
    staleTime: 5 * 60 * 1000,
  });
  return data;
}
