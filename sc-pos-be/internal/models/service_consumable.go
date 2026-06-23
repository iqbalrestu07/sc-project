package models

import "time"

// ServiceConsumable defines which products are consumed when a service is performed
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
