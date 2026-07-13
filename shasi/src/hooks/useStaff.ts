import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { ApiListResponse } from "@/integrations/api/types";
import type { Staff, StaffInsert, StaffUpdate } from "@/types/appointment";
import { toast } from "sonner";

export function useStaff(searchQuery?: string, page: number = 1, limit: number = 50) {
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["staff", searchQuery, page, limit],
    queryFn: async () => {
      try {
        const params: Record<string, any> = { page, limit };
        if (searchQuery) params.search = searchQuery;

        const data = await apiClient.get<ApiListResponse<Staff>>(
          API_ENDPOINTS.STAFF.LIST,
          params
        );
        return {
          data: data.data || [],
          has_next: data.has_next || false,
        };
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

  const staffList = staffQuery.data?.data || [];
  const doctors = staffList.filter((s) => s.role === "doctor");
  const therapists = staffList.filter((s) => s.role === "therapist");

  return {
    staff: staffList,
    hasNext: staffQuery.data?.has_next || false,
    doctors,
    therapists,
    isLoading: staffQuery.isLoading,
    error: staffQuery.error,
    createStaff,
    updateStaff,
  };
}
