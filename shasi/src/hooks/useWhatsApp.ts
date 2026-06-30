import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import { API_ENDPOINTS } from "@/integrations/api/endpoints";
import type { ApiResponse } from "@/integrations/api/types";
import type { 
    WhatsappStatusResponse, 
    WhatsappTemplate, 
    BlastRequest, 
    BlastResult,
    SendBulkRequest
} from "@/types/whatsapp";

// Keys for caching
export const WA_KEYS = {
    all: ['whatsapp'] as const,
    status: () => [...WA_KEYS.all, 'status'] as const,
    templates: () => [...WA_KEYS.all, 'templates'] as const,
};

export function useWhatsAppStatus() {
    return useQuery({
        queryKey: WA_KEYS.status(),
        queryFn: async () => {
            const response = await apiClient.get<ApiResponse<WhatsappStatusResponse>>(
                API_ENDPOINTS.WHATSAPP.STATUS
            );
            return response.data;
        },
    });
}

export function useWhatsAppLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.post<ApiResponse>(
                API_ENDPOINTS.WHATSAPP.LOGOUT
            );
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WA_KEYS.status() });
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
