import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type {
  TransactionInsert,
  TransactionUpdate,
  TransactionItemInsert,
  TransactionWithRelations,
  CartItem
} from "@/types/transaction";
import { toast } from "sonner";

export function useTransactions() {
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<TransactionWithRelations[]> => {
      try {
        const data = await apiClient.get<{ data: TransactionWithRelations[] }>(
          API_ENDPOINTS.TRANSACTIONS.LIST
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
    },
  });

  // Fetch transaction with items for detail view
  const fetchTransactionDetail = async (id: string): Promise<TransactionWithRelations> => {
    try {
      const data = await apiClient.get<{ data: TransactionWithRelations }>(
        API_ENDPOINTS.TRANSACTIONS.DETAIL(id)
      );
      return data.data;
    } catch (error) {
      console.error("Error fetching transaction detail:", error);
      throw error;
    }
  };

  const createTransaction = useMutation({
    mutationFn: async ({
      transaction,
      items
    }: {
      transaction: Omit<TransactionInsert, "transaction_code">;
      items: Omit<TransactionItemInsert, "transaction_id">[]
    }) => {
      try {
        const data = await apiClient.post<{ data: TransactionWithRelations }>(
          API_ENDPOINTS.TRANSACTIONS.CREATE,
          { transaction, items }
        );
        return data.data;
      } catch (error) {
        console.error("Error creating transaction:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create transaction: ${(error as Error).message}`);
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({
      id,
      payment_status,
      payment_method,
      paid_at
    }: {
      id: string;
      payment_status: string;
      payment_method?: string;
      paid_at?: string;
    }) => {
      try {
        const data = await apiClient.put<{ data: TransactionWithRelations }>(
          API_ENDPOINTS.TRANSACTIONS.UPDATE(id),
          {
            payment_status,
            payment_method,
            paid_at: paid_at || (payment_status === "paid" ? new Date().toISOString() : null),
          }
        );
        return data.data;
      } catch (error) {
        console.error("Error updating payment status:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // Refresh stock
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      if (data.payment_status === "paid") {
        toast.success("Payment completed! Commissions generated and stock deducted.");
      } else {
        toast.success("Payment status updated");
      }
    },
    onError: (error) => {
      toast.error(`Failed to update payment: ${(error as Error).message}`);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(API_ENDPOINTS.TRANSACTIONS.DELETE(id));
      } catch (error) {
        console.error("Error deleting transaction:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Transaction deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete transaction: ${(error as Error).message}`);
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
    createTransaction,
    updatePaymentStatus,
    deleteTransaction,
    fetchTransactionDetail,
    todayTransactions,
    todayRevenue,
  };
}
