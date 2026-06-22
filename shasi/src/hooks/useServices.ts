import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { Service, ServiceFormData, ServiceCategory } from "@/types/service";
import { toast } from "sonner";

export function useServiceCategories() {
  return useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      try {
        const data = await apiClient.get<{ data: ServiceCategory[] }>(
          API_ENDPOINTS.SERVICES.CATEGORIES
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching service categories:", error);
        throw error;
      }
    },
  });
}

export function useServices(searchQuery?: string) {
  return useQuery({
    queryKey: ["services", searchQuery],
    queryFn: async () => {
      try {
        const params = searchQuery ? { search: searchQuery } : {};
        const data = await apiClient.get<{ data: Service[] }>(
          API_ENDPOINTS.SERVICES.LIST,
          params
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching services:", error);
        throw error;
      }
    },
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      if (!id) return null;

      try {
        const data = await apiClient.get<{ data: Service }>(
          API_ENDPOINTS.SERVICES.DETAIL(id)
        );
        return data.data || null;
      } catch (error) {
        console.error("Error fetching service:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: ServiceFormData) => {
      try {
        const data = await apiClient.post<{ data: Service }>(
          API_ENDPOINTS.SERVICES.CREATE,
          formData
        );
        return data.data;
      } catch (error) {
        console.error("Error creating service:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add service: ${(error as Error).message}`);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: ServiceFormData }) => {
      try {
        const data = await apiClient.put<{ data: Service }>(
          API_ENDPOINTS.SERVICES.UPDATE(id),
          formData
        );
        return data.data;
      } catch (error) {
        console.error("Error updating service:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service", variables.id] });
      toast.success("Service updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update service: ${(error as Error).message}`);
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(API_ENDPOINTS.SERVICES.DELETE(id));
      } catch (error) {
        console.error("Error deleting service:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete service: ${(error as Error).message}`);
    },
  });
}
