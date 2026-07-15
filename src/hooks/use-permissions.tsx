import { useQuery } from "@tanstack/react-query";
import { getMyPermissions } from "@/lib/admin/admin.functions";
import { EMPTY_PERMISSIONS, type Permissions } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

export function usePermissions() {
  const { user, loading } = useAuth();
  const query = useQuery<Permissions>({
    queryKey: ["permissions", user?.id],
    queryFn: () => getMyPermissions(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  return { ...query, data: query.data ?? (user ? undefined : EMPTY_PERMISSIONS), loadingAuth: loading };
}