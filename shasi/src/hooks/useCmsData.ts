import { useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type {
  CmsHero,
  CmsAbout,
  CmsServiceOverview,
  CmsPromotion,
  CmsGallery,
  CmsTestimonial,
  CmsCta,
  CmsContact
} from "@/types/cms";

export function useCmsHero() {
  return useQuery({
    queryKey: ["cms-hero"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsHero | null }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("hero")
        );
        return data.data as CmsHero | null;
      } catch (error) {
        console.error("Error fetching CMS hero:", error);
        return null;
      }
    },
  });
}

export function useCmsAbout() {
  return useQuery({
    queryKey: ["cms-about"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsAbout | null }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("about")
        );
        return data.data as CmsAbout | null;
      } catch (error) {
        console.error("Error fetching CMS about:", error);
        return null;
      }
    },
  });
}

export function useCmsServicesOverview() {
  return useQuery({
    queryKey: ["cms-services-overview"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsServiceOverview[] }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("services-overview")
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching CMS services overview:", error);
        return [];
      }
    },
  });
}

export function useCmsPromotions() {
  return useQuery({
    queryKey: ["cms-promotions"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsPromotion[] }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("promotions")
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching CMS promotions:", error);
        return [];
      }
    },
  });
}

export function useCmsGallery() {
  return useQuery({
    queryKey: ["cms-gallery"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsGallery[] }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("gallery")
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching CMS gallery:", error);
        return [];
      }
    },
  });
}

export function useCmsTestimonials() {
  return useQuery({
    queryKey: ["cms-testimonials"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsTestimonial[] }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("testimonials")
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching CMS testimonials:", error);
        return [];
      }
    },
  });
}

export function useCmsCta() {
  return useQuery({
    queryKey: ["cms-cta"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsCta | null }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("cta")
        );
        return data.data as CmsCta | null;
      } catch (error) {
        console.error("Error fetching CMS CTA:", error);
        return null;
      }
    },
  });
}

export function useCmsContact() {
  return useQuery({
    queryKey: ["cms-contact"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: CmsContact | null }>(
          API_ENDPOINTS.CMS.PAGE_DETAIL("contact")
        );
        return data.data as CmsContact | null;
      } catch (error) {
        console.error("Error fetching CMS contact:", error);
        return null;
      }
    },
  });
}
