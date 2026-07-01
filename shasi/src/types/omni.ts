export interface OmniConversation {
  id: string;
  organization_id: string;
  platform: string;
  device_id: string;
  customer_identifier: string;
  customer_name: string;
  last_message_content: string;
  last_message_at: string;
  unread_count: number;
  status: string; // 'open' | 'resolved'
  created_at: string;
  updated_at: string;
}

export interface OmniMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  content_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  content: string;
  media_url?: string;
  sender_user_id?: string;
  timestamp: string;
}

export interface WsEvent {
  type: string;
  payload: any;
}
