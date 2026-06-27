import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { toast } from "sonner";

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // enriched by backend JOIN
  product_name: string;
  product_unit: string;
  transaction_code?: string | null;
}

export interface StockMovementInsert {
  product_id: string;
  movement_type: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface StockMovementFilters {
  productId?: string;
  referenceType?: "manual" | "transaction" | "";
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export function useStockMovements(filters: StockMovementFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["stock-movements", filters],
    queryFn: async (): Promise<StockMovement[]> => {
      const params: Record<string, string> = {};
      if (filters.productId)     params.product_id      = filters.productId;
      if (filters.referenceType) params.reference_type  = filters.referenceType;
      if (filters.from)          params.from             = filters.from;
      if (filters.to)            params.to               = filters.to;
      const data = await apiClient.get<{ data: StockMovement[] }>(
        API_ENDPOINTS.STOCK_MOVEMENTS.LIST,
        Object.keys(params).length ? params : undefined
      );
      return data.data || [];
    },
  });

  const createMovement = useMutation({
    mutationFn: async (payload: StockMovementInsert) => {
      const data = await apiClient.post<{ data: StockMovement }>(
        API_ENDPOINTS.STOCK_MOVEMENTS.CREATE,
        payload
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      const typeLabel =
        variables.movement_type === "in"
          ? "Stok masuk"
          : variables.movement_type === "out"
          ? "Stok keluar"
          : "Penyesuaian stok";
      toast.success(`${typeLabel} berhasil dicatat`);
    },
    onError: (error) => {
      toast.error(`Gagal mencatat pergerakan stok: ${(error as Error).message}`);
    },
  });

  return {
    movements: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createMovement,
  };
}
