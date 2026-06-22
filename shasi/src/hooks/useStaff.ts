import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { Staff, StaffInsert, StaffUpdate } from "@/types/appointment";
import { toast } from "sonner";

export function useStaff() {
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: async (): Promise<Staff[]> => {
      try {
        const data = await apiClient.get<{ data: Staff[] }>(
          API_ENDPOINTS.STAFF.LIST
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching staff:", error);
        throw error;
      }
    },
  });

  const createStaff = useMutation({
    mutationFn: async (staff: StaffInsert) => {
      try {
        const data = await apiClient.post<{ data: Staff }>(
          API_ENDPOINTS.STAFF.CREATE,
          staff
        );
        return data.data;
      } catch (error) {
        console.error("Error creating staff:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add staff: ${(error as Error).message}`);
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: StaffUpdate & { id: string }) => {
      try {
        const data = await apiClient.put<{ data: Staff }>(
          API_ENDPOINTS.STAFF.UPDATE(id),
          updates
        );
        return data.data;
      } catch (error) {
        console.error("Error updating staff:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update staff: ${(error as Error).message}`);
    },
  });

  const doctors = staffQuery.data?.filter((s) => s.role === "doctor") || [];
  const therapists = staffQuery.data?.filter((s) => s.role === "therapist") || [];

  return {
    staff: staffQuery.data || [],
    doctors,
    therapists,
    isLoading: staffQuery.isLoading,
    error: staffQuery.error,
    createStaff,
    updateStaff,
  };
}
