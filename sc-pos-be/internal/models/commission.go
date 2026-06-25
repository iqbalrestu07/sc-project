package models

import "time"

// Commission represents commission earned by staff
type Commission struct {
	ID                string     `json:"id" db:"id"`
	OrganizationID    string     `json:"organization_id,omitempty" db:"organization_id"`
	StaffID           string     `json:"staff_id" db:"staff_id"`
	StaffRole         string     `json:"staff_role" db:"staff_role"`
	TransactionID     string     `json:"transaction_id" db:"transaction_id"`
	TransactionItemID string     `json:"transaction_item_id" db:"transaction_item_id"`
	BaseAmount        float64    `json:"base_amount" db:"base_amount"`
	CommissionType    string     `json:"commission_type" db:"commission_type"`
	CommissionValue   float64    `json:"commission_value" db:"commission_value"`
	CommissionAmount  float64    `json:"commission_amount" db:"commission_amount"`
	Status            string     `json:"status" db:"status"` // pending, paid
	CreatedBy         *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy         *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt         *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}
