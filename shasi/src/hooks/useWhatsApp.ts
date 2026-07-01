import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { API_ENDPOINTS } from "@/integrations/api/endpoints";
import type { ApiResponse } from "@/integrations/api/types";
import type { 
    WhatsappDevice, 
    WhatsappTemplate, 
    BlastRequest, 
    BlastResult,
    SendBulkRequest
} from "@/types/whatsapp";

// Keys for caching
export const WA_KEYS = {
    all: ['whatsapp'] as const,
    devices: () => [...WA_KEYS.all, 'devices'] as const,
    templates: () => [...WA_KEYS.all, 'templates'] as const,
};

export function useWhatsAppDevices() {
    return useQuery({
        queryKey: WA_KEYS.devices(),
        queryFn: async () => {
            const response = await apiClient.get<ApiResponse<WhatsappDevice[]>>(
                API_ENDPOINTS.WHATSAPP.DEVICES
            );
            return response.data || [];
        },
    });
}

export function useWhatsAppLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (deviceId: string) => {
            const response = await apiClient.post<ApiResponse>(
                API_ENDPOINTS.WHATSAPP.LOGOUT,
                { device_id: deviceId }
            );
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WA_KEYS.devices() });
        },
    });
}

export function useWhatsAppTemplates() {
    return useQuery({
        queryKey: WA_KEYS.templates(),
        queryFn: async () => {
            const response = await apiClient.get<ApiResponse<WhatsappTemplate[]>>(
                API_ENDPOINTS.WHATSAPP.TEMPLATES
            );
            return response.data || [];
        },
    });
}

export function useCreateWhatsAppTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { name: string; content: string }) => {
            const response = await apiClient.post<ApiResponse<WhatsappTemplate>>(
                API_ENDPOINTS.WHATSAPP.TEMPLATES,
                data
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WA_KEYS.templates() });
        },
    });
}

export function useSendWhatsAppBlast() {
    return useMutation({
        mutationFn: async (data: BlastRequest) => {
            const response = await apiClient.post<ApiResponse<BlastResult>>(
                API_ENDPOINTS.WHATSAPP.BLAST,
                data
            );
            return response.data;
        },
    });
}

export function useSendWhatsAppBulk() {
    return useMutation({
        mutationFn: async (data: SendBulkRequest) => {
            const response = await apiClient.post<ApiResponse<BlastResult>>(
                API_ENDPOINTS.WHATSAPP.SEND_BULK,
                data
            );
            return response.data;
        },
    });
}
