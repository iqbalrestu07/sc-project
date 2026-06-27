import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { toast } from "sonner";

export interface ClinicSettings {
  id: string;
  clinic_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_rate: number | null;
  tax_inclusive: boolean | null;
  low_stock_alerts: boolean | null;
  appointment_reminders: boolean | null;
  expiry_warnings: boolean | null;
  reminder_hours_before: number | null;
  whatsapp_reminder_enabled: boolean | null;
  email_reminder_enabled: boolean | null;
  whatsapp_business_phone_id: string | null;
  invoice_header_title: string | null;
  invoice_header_description: string | null;
  invoice_footer_text: string | null;
  maps_embed_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useClinicSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async (): Promise<ClinicSettings | null> => {
      try {
        const data = await apiClient.get<{ data: ClinicSettings | null }>(
          API_ENDPOINTS.SETTINGS.CLINIC
        );
        return data.data || null;
      } catch (error) {
        console.error("Error fetching clinic settings:", error);
        throw error;
      }
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<ClinicSettings>) => {
      try {
        const data = await apiClient.put<{ data: ClinicSettings }>(
          API_ENDPOINTS.SETTINGS.CLINIC_UPDATE,
          updates
        );
        return data.data;
      } catch (error) {
        console.error("Error updating clinic settings:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${(error as Error).message}`);
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSettings,
  };
}
