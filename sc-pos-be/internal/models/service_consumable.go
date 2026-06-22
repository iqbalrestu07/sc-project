package models

import "time"

// ServiceConsumable defines which products are consumed when a service is performed
type ServiceConsumable struct {
	ID           string    `json:"id" db:"id"`
	ServiceID    string    `json:"service_id" db:"service_id"`
	ProductID    string    `json:"product_id" db:"product_id"`
	QuantityUsed float64   `json:"quantity_used" db:"quantity_used"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
