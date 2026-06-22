import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { Service, ServiceFormData, ServiceCategory } from "@/types/service";
import { toast } from "sonner";

export function useServiceCategories() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
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

  const createCategory = useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      const data = await apiClient.post<{ data: ServiceCategory }>(
        API_ENDPOINTS.SERVICES.CATEGORY_CREATE,
        category
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${(error as Error).message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; description?: string }) => {
      const data = await apiClient.put<{ data: ServiceCategory }>(
        API_ENDPOINTS.SERVICES.CATEGORY_UPDATE(id),
        updates
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success("Category updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${(error as Error).message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.SERVICES.CATEGORY_DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${(error as Error).message}`);
    },
  });

  return { ...categoriesQuery, createCategory, updateCategory, deleteCategory };
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
