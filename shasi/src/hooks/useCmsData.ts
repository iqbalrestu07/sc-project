import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type {
  CmsHero,
  CmsAbout,
  CmsServiceOverview,
  CmsPromotion,
  CmsGallery,
  CmsTestimonial,
  CmsCta,
  CmsContact,
} from "@/types/cms";

function usePublicOrgSlug() {
  return useParams<{ orgSlug?: string }>().orgSlug;
}

function useCmsPage<T>(pageID: string, orgSlug: string | undefined, fallback: T) {
  return useQuery({
    queryKey: ["cms", pageID, orgSlug ?? "default"],
    queryFn: async (): Promise<T> => {
      try {
        const data = await apiClient.get<{ data: T }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL(pageID),
          orgSlug ? { org: orgSlug } : undefined
        );
        return data.data ?? fallback;
      } catch (error) {
        console.error(`Error fetching CMS ${pageID}:`, error);
        return fallback;
      }
    },
  });
}

export function useCmsHero() {
  return useCmsPage<CmsHero | null>("hero", usePublicOrgSlug(), null);
}

export function useCmsAbout() {
  return useCmsPage<CmsAbout | null>("about", usePublicOrgSlug(), null);
}

export function useCmsServicesOverview() {
  return useCmsPage<CmsServiceOverview[]>("services-overview", usePublicOrgSlug(), []);
}

export function useCmsPromotions() {
  return useCmsPage<CmsPromotion[]>("promotions", usePublicOrgSlug(), []);
}

export function useCmsGallery() {
  return useCmsPage<CmsGallery[]>("gallery", usePublicOrgSlug(), []);
}

export function useCmsTestimonials() {
  return useCmsPage<CmsTestimonial[]>("testimonials", usePublicOrgSlug(), []);
}

export function useCmsCta() {
  return useCmsPage<CmsCta | null>("cta", usePublicOrgSlug(), null);
}

export function useCmsContact() {
  return useCmsPage<CmsContact | null>("contact", usePublicOrgSlug(), null);
}
