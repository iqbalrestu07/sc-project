package models

import "time"

// StockMovement records every inventory change for audit trail
type StockMovement struct {
	ID            string    `json:"id" db:"id"`
	ProductID     string    `json:"product_id" db:"product_id"`
	MovementType  string    `json:"movement_type" db:"movement_type"` // in, out, adjustment
	Quantity      int       `json:"quantity" db:"quantity"`
	Reason        *string   `json:"reason" db:"reason"`
	ReferenceID   *string   `json:"reference_id" db:"reference_id"`
	ReferenceType *string   `json:"reference_type" db:"reference_type"`
	Notes         *string   `json:"notes" db:"notes"`
	CreatedBy     *string   `json:"created_by" db:"created_by"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}
