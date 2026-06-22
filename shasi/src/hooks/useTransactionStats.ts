import { useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { TransactionWithRelations } from "@/types/transaction";

export function useTransactionStats() {
  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<TransactionWithRelations[]> => {
      try {
        const data = await apiClient.get<{ data: TransactionWithRelations[] }>(
          API_ENDPOINTS.TRANSACTIONS.LIST
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching transaction stats:", error);
        throw error;
      }
    },
  });

  // Today's stats
  const todayTransactions = transactionsQuery.data?.filter((t) => {
    const today = new Date().toDateString();
    return new Date(t.created_at!).toDateString() === today;
  }) || [];

  const todayRevenue = todayTransactions
    .filter((t) => t.payment_status === "paid")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    todayTransactions,
    todayRevenue,
  };
}
