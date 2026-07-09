import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { ConsumableGroup } from "@/types/consumable_group";
import { toast } from "sonner";

// ─── Fetch groups for a service ───────────────────────────────────────────────

export function useConsumableGroups(serviceId: string | null | undefined) {
  return useQuery({
    queryKey: ["consumable-groups", serviceId],
    queryFn: async (): Promise<ConsumableGroup[]> => {
      if (!serviceId) return [];
      const data = await apiClient.get<{ data: ConsumableGroup[] }>(
        API_ENDPOINTS.CONSUMABLE_GROUPS.LIST(serviceId)
      );
      return data.data ?? [];
    },
    enabled: !!serviceId,
  });
}

// ─── CRUD for groups & items ──────────────────────────────────────────────────

export function useConsumableGroupMutations(serviceId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["consumable-groups", serviceId] });

  const createGroup = useMutation({
    mutationFn: (body: { name: string; quantity_used: number }) =>
      apiClient.post(API_ENDPOINTS.CONSUMABLE_GROUPS.CREATE(serviceId), body),
    onSuccess: () => { invalidate(); toast.success("Consumable group dibuat"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateGroup = useMutation({
    mutationFn: ({ groupId, ...body }: { groupId: string; name: string; quantity_used: number }) =>
      apiClient.put(API_ENDPOINTS.CONSUMABLE_GROUPS.UPDATE(groupId), body),
    onSuccess: () => { invalidate(); toast.success("Consumable group diupdate"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) =>
      apiClient.delete(API_ENDPOINTS.CONSUMABLE_GROUPS.DELETE(groupId)),
    onSuccess: () => { invalidate(); toast.success("Consumable group dihapus"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: ({ groupId, product_id, priority }: { groupId: string; product_id: string; priority: number }) =>
      apiClient.post(API_ENDPOINTS.CONSUMABLE_GROUPS.ADD_ITEM(groupId), { product_id, priority }),
    onSuccess: () => { invalidate(); toast.success("Produk alternatif ditambahkan"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.delete(API_ENDPOINTS.CONSUMABLE_GROUPS.DELETE_ITEM(itemId)),
    onSuccess: () => { invalidate(); toast.success("Produk alternatif dihapus"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createGroup, updateGroup, deleteGroup, addItem, deleteItem };
}
