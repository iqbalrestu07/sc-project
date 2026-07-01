import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../integrations/api/client';
import { API_ENDPOINTS } from '../integrations/api/endpoints';
import { OmniConversation, OmniMessage, WsEvent } from '../types/omni';
import { useAuth } from '@/contexts/AuthContext';

export const useOmniChat = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { activeOrg } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  // Queries
  const { data: conversations, isLoading: isConversationsLoading } = useQuery({
    queryKey: ['omni_conversations', activeOrg?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: OmniConversation[] }>(API_ENDPOINTS.OMNI.CONVERSATIONS);
      return data.data;
    },
    enabled: !!activeOrg?.id,
  });

  const { data: messages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['omni_messages', conversationId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: OmniMessage[] }>(API_ENDPOINTS.OMNI.MESSAGES(conversationId!));
      return data.data.reverse(); // Reverse to get chronological order if API sends descending
    },
    enabled: !!conversationId,
  });

  // Mutations
  const sendMessage = useMutation({
    mutationFn: async ({ content, contentType = 'text' }: { content: string, contentType?: string }) => {
      const { data } = await apiClient.post<{ data: OmniMessage }>(API_ENDPOINTS.OMNI.SEND_MESSAGE(conversationId!), {
        content,
        content_type: contentType,
      });
      return data.data;
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['omni_messages', conversationId], (old: OmniMessage[] | undefined) => {
        if (!old) return [newMessage];
        return [...old, newMessage];
      });
      queryClient.invalidateQueries({ queryKey: ['omni_conversations'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(API_ENDPOINTS.OMNI.MARK_AS_READ(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omni_conversations'] });
    },
  });

  // WebSocket Connection
  useEffect(() => {
    if (!activeOrg?.id) return;

    // Get the base URL from apiClient and replace http with ws
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/omni/ws?org_id=${activeOrg.id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: WsEvent = JSON.parse(event.data);
        if (data.type === 'new_message') {
          // Invalidate conversations to get updated list
          queryClient.invalidateQueries({ queryKey: ['omni_conversations'] });
          
          // If we are currently viewing the conversation that received the message
          if (data.payload && data.payload.conversation_id) {
             queryClient.invalidateQueries({ queryKey: ['omni_messages', data.payload.conversation_id] });
          }
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onclose = () => {
      console.log('Omni WS Closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [activeOrg?.id, queryClient]);

  return {
    conversations,
    isConversationsLoading,
    messages,
    isMessagesLoading,
    sendMessage,
    markAsRead,
  };
};
