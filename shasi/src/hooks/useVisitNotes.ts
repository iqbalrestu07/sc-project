import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { API_ENDPOINTS } from "@/integrations/api/endpoints";
import type { VisitNote, VisitNoteWithDetails, VisitNoteInput } from "@/types/visit_note";

// ─── Visit Notes for a patient ──────────────────────────────────────────────

export function usePatientVisitNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-visit-notes", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const data = await apiClient.get<{ data: VisitNoteWithDetails[] }>(
        API_ENDPOINTS.VISIT_NOTES.LIST(patientId)
      );
      return data.data || [];
    },
    enabled: !!patientId,
  });
}

// ─── Visit Note CRUD ────────────────────────────────────────────────────────

export function useVisitNotes() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ patientId, input }: { patientId: string; input: VisitNoteInput }) => {
      const data = await apiClient.post<{ data: VisitNote }>(
        API_ENDPOINTS.VISIT_NOTES.CREATE(patientId),
        input
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-visit-notes"] });
      toast.success("Rekam medis berhasil ditambahkan");
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambahkan rekam medis: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VisitNoteInput }) => {
      const data = await apiClient.put<{ data: VisitNote }>(
        API_ENDPOINTS.VISIT_NOTES.UPDATE(id),
        input
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-visit-notes"] });
      toast.success("Rekam medis berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui rekam medis: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.VISIT_NOTES.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-visit-notes"] });
      toast.success("Rekam medis berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus rekam medis: ${error.message}`);
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}

// ─── Today's Queue ──────────────────────────────────────────────────────────

export function useTodayQueue() {
  return useQuery({
    queryKey: ["today-queue"],
    queryFn: async () => {
      const data = await apiClient.get<{
        data: {
          waiting: any[];
          in_progress: any[];
          completed: any[];
          other: any[];
        };
      }>(API_ENDPOINTS.APPOINTMENTS.TODAY_QUEUE);
      return data.data;
    },
    refetchInterval: 30000, // refresh every 30 seconds
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const data = await apiClient.patch<{ data: any }>(
        API_ENDPOINTS.APPOINTMENTS.UPDATE_STATUS(id),
        { status }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-queue"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status antrian diperbarui");
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui status: ${error.message}`);
    },
  });
}

// ─── Add item to transaction ────────────────────────────────────────────────

export function useAddTransactionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      item,
    }: {
      transactionId: string;
      item: {
        item_type?: string;
        service_id?: string | null;
        product_id?: string | null;
        quantity?: number;
        unit_price: number;
        discount_amount?: number | null;
        doctor_id?: string | null;
        therapist_id?: string | null;
      };
    }) => {
      const data = await apiClient.post<{ data: any }>(
        API_ENDPOINTS.TRANSACTIONS.ADD_ITEM(transactionId),
        item
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-items"] });
      toast.success("Item berhasil ditambahkan ke transaksi");
    },
    onError: (error: Error) => {
      toast.error(`Gagal menambahkan item: ${error.message}`);
    },
  });
}
