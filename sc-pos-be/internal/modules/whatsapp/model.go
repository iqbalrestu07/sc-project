package whatsapp

import "time"

type WhatsappDevice struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	JID            string    `json:"jid"`
	Status         string    `json:"status"` // "connected" or "disconnected"
	CreatedAt      time.Time `json:"created_at"`
}
