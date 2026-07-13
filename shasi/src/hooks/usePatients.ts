import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { ApiListResponse } from "@/integrations/api/types";
import { Patient, PatientFormData } from "@/types/patient";
import { toast } from "sonner";

export function usePatients(searchQuery?: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ["patients", searchQuery, page, limit],
    queryFn: async () => {
      try {
        const params: Record<string, any> = { page, limit };
        if (searchQuery) params.search = searchQuery;
        
        const data = await apiClient.get<ApiListResponse<Patient>>(
          API_ENDPOINTS.PATIENTS.LIST,
          params
        );
        return {
          data: data.data || [],
          has_next: data.has_next || false,
        };
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

export interface PatientVisit {
  id: string;
  scheduled_at: string;
  status: string;
  service_name: string;
  doctor_name?: string | null;
  therapist_name?: string | null;
  notes?: string | null;
}

export interface PatientTransaction {
  id: string;
  transaction_code: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at: string;
  doctor_name?: string | null;
  therapist_name?: string | null;
}

export function usePatientVisits(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-visits", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const data = await apiClient.get<{ data: PatientVisit[] }>(
        API_ENDPOINTS.PATIENTS.VISITS(patientId)
      );
      return data.data || [];
    },
    enabled: !!patientId,
  });
}

export function usePatientTransactions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-transactions", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const data = await apiClient.get<{ data: PatientTransaction[] }>(
        API_ENDPOINTS.PATIENTS.TRANSACTIONS(patientId)
      );
      return data.data || [];
    },
    enabled: !!patientId,
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
