import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { Patient, PatientFormData } from "@/types/patient";
import { toast } from "sonner";

export function usePatients(searchQuery?: string) {
  return useQuery({
    queryKey: ["patients", searchQuery],
    queryFn: async () => {
      try {
        const params = searchQuery ? { search: searchQuery } : {};
        const data = await apiClient.get<{ data: Patient[] }>(
          API_ENDPOINTS.PATIENTS.LIST,
          params
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching patients:", error);
        throw error;
      }
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      if (!id) return null;

      try {
        const data = await apiClient.get<{ data: Patient }>(
          API_ENDPOINTS.PATIENTS.DETAIL(id)
        );
        return data.data || null;
      } catch (error) {
        console.error("Error fetching patient:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: PatientFormData) => {
      try {
        const data = await apiClient.post<{ data: Patient }>(
          API_ENDPOINTS.PATIENTS.CREATE,
          formData
        );
        return data.data;
      } catch (error) {
        console.error("Error creating patient:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create patient: ${(error as Error).message}`);
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PatientFormData> }) => {
      try {
        const result = await apiClient.put<{ data: Patient }>(
          API_ENDPOINTS.PATIENTS.UPDATE(id),
          data
        );
        return result.data;
      } catch (error) {
        console.error("Error updating patient:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update patient: ${(error as Error).message}`);
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(API_ENDPOINTS.PATIENTS.DELETE(id));
      } catch (error) {
        console.error("Error deleting patient:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete patient: ${(error as Error).message}`);
    },
  });
}
