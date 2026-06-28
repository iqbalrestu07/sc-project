import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { Product } from "@/types/product";
import type {
  ConsumableUsageLog,
  ConsumableUsageInsert,
  ConsumableUsageFilters,
  MarkConsumablePayload,
} from "@/types/consumable";
import { toast } from "sonner";

// ─── Consumable products list ──────────────────────────────────────────────────

export function useConsumableProducts() {
  return useQuery({
    queryKey: ["consumable-products"],
    queryFn: async (): Promise<Product[]> => {
      const data = await apiClient.get<{ data: Product[] }>(
        API_ENDPOINTS.CONSUMABLE_ITEMS.LIST
      );
      return data.data || [];
    },
  });
}

// ─── Usage logs ───────────────────────────────────────────────────────────────

export function useConsumableUsageLogs(filters: ConsumableUsageFilters = {}) {
  return useQuery({
    queryKey: ["consumable-usage-logs", filters],
    queryFn: async (): Promise<ConsumableUsageLog[]> => {
      const params: Record<string, string> = {};
      if (filters.productId) params.product_id = filters.productId;
      if (filters.purpose)   params.purpose     = filters.purpose;
      if (filters.from)      params.from         = filters.from;
      if (filters.to)        params.to           = filters.to;
      const data = await apiClient.get<{ data: ConsumableUsageLog[] }>(
        API_ENDPOINTS.CONSUMABLE_ITEMS.USAGE_LIST,
        Object.keys(params).length ? params : undefined
      );
      return data.data || [];
    },
  });
}

// ─── Create usage log ─────────────────────────────────────────────────────────

export function useCreateConsumableUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConsumableUsageInsert) => {
      const data = await apiClient.post<{ data: ConsumableUsageLog }>(
        API_ENDPOINTS.CONSUMABLE_ITEMS.USAGE_CREATE,
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumable-usage-logs"] });
      queryClient.invalidateQueries({ queryKey: ["consumable-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Pemakaian berhasil dicatat");
    },
    onError: (error) => {
      toast.error(`Gagal mencatat pemakaian: ${(error as Error).message}`);
    },
  });
}

// ─── Mark / unmark product as consumable ──────────────────────────────────────

export function useMarkConsumable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: MarkConsumablePayload }) => {
      await apiClient.put(
        API_ENDPOINTS.CONSUMABLE_ITEMS.MARK_CONSUMABLE(id),
        payload
      );
    },
    onSuccess: (_, { payload }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["consumable-products"] });
      toast.success(
        payload.is_consumable
          ? "Produk ditandai sebagai habis pakai"
          : "Tanda habis pakai dihapus dari produk"
      );
    },
    onError: (error) => {
      toast.error(`Gagal mengubah status habis pakai: ${(error as Error).message}`);
    },
  });
}
