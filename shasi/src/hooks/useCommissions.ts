import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { Commission } from "@/types/transaction";
import { toast } from "sonner";

interface CommissionWithRelations extends Commission {
  staff?: { id: string; full_name: string; role: string } | null;
  transaction?: { id: string; transaction_code: string } | null;
}

export function useCommissions() {
  const queryClient = useQueryClient();

  const commissionsQuery = useQuery({
    queryKey: ["commissions"],
    queryFn: async (): Promise<CommissionWithRelations[]> => {
      try {
        const data = await apiClient.get<{ data: CommissionWithRelations[] }>(
          API_ENDPOINTS.COMMISSIONS.LIST
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching commissions:", error);
        throw error;
      }
    },
  });

  // Mutation to update commission status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "pending" | "paid" }) => {
      try {
        await apiClient.post("/commissions/update-status", { ids, status });
      } catch (error) {
        console.error("Error updating commission status:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Commission status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update commission: ${(error as Error).message}`);
    },
  });

  // Calculate totals by status
  const pendingCommissions = commissionsQuery.data?.filter(
    (c) => c.status === "pending"
  ) || [];

  const totalPending = pendingCommissions.reduce(
    (sum, c) => sum + Number(c.commission_amount || 0),
    0
  );

  // Group by staff
  const commissionsByStaff = commissionsQuery.data?.reduce(
    (acc, comm) => {
      if (!comm.staff) return acc;
      const staffId = comm.staff.id;
      if (!acc[staffId]) {
        acc[staffId] = {
          staff: comm.staff,
          total: 0,
          pending: 0,
          count: 0,
        };
      }
      acc[staffId].total += Number(comm.commission_amount || 0);
      if (comm.status === "pending") {
        acc[staffId].pending += Number(comm.commission_amount || 0);
      }
      acc[staffId].count += 1;
      return acc;
    },
    {} as Record<string, { staff: { id: string; full_name: string; role: string }; total: number; pending: number; count: number }>
  ) || {};

  return {
    commissions: commissionsQuery.data || [],
    pendingCommissions,
    totalPending,
    commissionsByStaff: Object.values(commissionsByStaff),
    isLoading: commissionsQuery.isLoading,
    error: commissionsQuery.error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}
