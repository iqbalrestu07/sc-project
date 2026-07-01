package models

import "time"

type OmniConversation struct {
	ID                 string    `json:"id" db:"id"`
	OrganizationID     string    `json:"organization_id" db:"organization_id"`
	Platform           string    `json:"platform" db:"platform"`
	DeviceID           string    `json:"device_id" db:"device_id"`
	CustomerIdentifier string    `json:"customer_identifier" db:"customer_identifier"`
	CustomerName       string    `json:"customer_name" db:"customer_name"`
	LastMessageContent string    `json:"last_message_content" db:"last_message_content"`
	LastMessageAt      time.Time `json:"last_message_at" db:"last_message_at"`
	UnreadCount        int       `json:"unread_count" db:"unread_count"`
	Status             string    `json:"status" db:"status"` // 'open' or 'resolved'
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

type OmniMessage struct {
	ID             string     `json:"id" db:"id"`
	ConversationID string     `json:"conversation_id" db:"conversation_id"`
	Direction      string     `json:"direction" db:"direction"` // 'inbound' or 'outbound'
	Status         string     `json:"status" db:"status"`       // 'sent', 'delivered', 'read', 'failed'
	ContentType    string     `json:"content_type" db:"content_type"` // 'text', 'image', 'document', etc.
	Content        string     `json:"content" db:"content"`
	MediaURL       string     `json:"media_url" db:"media_url"`
	SenderUserID   *string    `json:"sender_user_id" db:"sender_user_id"`
	Timestamp      time.Time  `json:"timestamp" db:"timestamp"`
}
