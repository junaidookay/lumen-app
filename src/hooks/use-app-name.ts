import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranding } from "@/lib/admin/settings.functions";
import { SITE } from "@/constants/site";

/**
 * Returns the app name from the settings table.
 * Uses useState + useEffect to avoid SSR hydration mismatch.
 */
export function useAppName() {
  const [name, setName] = useState<string>(SITE.name);
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => getBranding(),
    staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (branding?.name) setName(branding.name);
  }, [branding]);
  return name;
}
