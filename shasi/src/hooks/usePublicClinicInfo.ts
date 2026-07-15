import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";

export interface PublicClinicInfo {
  clinic_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  maps_embed_url: string | null;
}

/**
 * Fetches the public subset of clinic settings.
 * Does NOT require authentication — safe to use on the landing page.
 * Endpoint: GET /api/public/clinic-info
 */
export function usePublicClinicInfo() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  return useQuery({
    queryKey: ["public-clinic-info", orgSlug ?? "default"],
    queryFn: async (): Promise<PublicClinicInfo | null> => {
      const data = await apiClient.get<{ data: PublicClinicInfo }>(
        API_ENDPOINTS.SETTINGS.PUBLIC_CLINIC_INFO,
        orgSlug ? { org: orgSlug } : undefined
      );
      return data.data ?? null;
    },
    // Stale after 5 minutes — maps URL rarely changes
    staleTime: 5 * 60 * 1000,
  });
}
