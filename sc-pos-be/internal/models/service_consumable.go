package models

import "time"

// ServiceConsumable defines which products are consumed when a service is performed.
// Legacy table — kept for backward compatibility. New code should use
// ServiceConsumableGroup + ServiceConsumableGroupItem instead.
type ServiceConsumable struct {
	ID           string     `json:"id" db:"id"`
	ServiceID    string     `json:"service_id" db:"service_id"`
	ProductID    string     `json:"product_id" db:"product_id"`
	QuantityUsed float64    `json:"quantity_used" db:"quantity_used"`
	CreatedBy    *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy    *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
}

// ServiceConsumableGroup represents a consumable requirement slot for a service.
// Example: for the "Meso" service there might be a group called "Masker" with
// quantity_used=1, meaning one unit of a masker product is consumed per session.
type ServiceConsumableGroup struct {
	ID             string     `json:"id" db:"id"`
	ServiceID      string     `json:"service_id" db:"service_id"`
	Name           string     `json:"name" db:"name"`
	QuantityUsed   float64    `json:"quantity_used" db:"quantity_used"`
	OrganizationID *string    `json:"organization_id,omitempty" db:"organization_id"`
	CreatedBy      *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy      *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`

	// Items populated by JOIN — not stored in this table
	Items []ServiceConsumableGroupItem `json:"items,omitempty" db:"-"`
}

// ServiceConsumableGroupItem is one alternative product that can fulfil a group's
// consumable slot. Products are ordered by priority (0 = most preferred).
type ServiceConsumableGroupItem struct {
	ID             string     `json:"id" db:"id"`
	GroupID        string     `json:"group_id" db:"group_id"`
	ProductID      string     `json:"product_id" db:"product_id"`
	Priority       int        `json:"priority" db:"priority"`
	OrganizationID *string    `json:"organization_id,omitempty" db:"organization_id"`
	CreatedBy      *string    `json:"created_by,omitempty" db:"created_by"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`

	// Denormalized product info populated by JOIN — not stored in this table
	ProductName  *string  `json:"product_name,omitempty" db:"-"`
	ProductUnit  *string  `json:"product_unit,omitempty" db:"-"`
	CurrentStock *int     `json:"current_stock,omitempty" db:"-"`
	SellingPrice *float64 `json:"selling_price,omitempty" db:"-"`
}
