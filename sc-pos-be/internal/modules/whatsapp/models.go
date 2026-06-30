package whatsapp

import "time"

type Template struct {
	ID             string    `json:"id" db:"id"`
	Name           string    `json:"name" db:"name"`
	Content        string    `json:"content" db:"content"`
	OrganizationID string    `json:"organization_id" db:"organization_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type DeviceMapping struct {
	OrganizationID string    `json:"organization_id" db:"organization_id"`
	JID            string    `json:"jid" db:"jid"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}
