package models

import "time"

// ConsumableUsageLog records every instance of a consumable product being used/dispensed,
// with structured context about the purpose and optionally linked to an appointment or transaction.
type ConsumableUsageLog struct {
	ID            string    `json:"id" db:"id"`
	ProductID     string    `json:"product_id" db:"product_id"`
	Quantity      float64   `json:"quantity" db:"quantity"`
	// UsagePurpose: treatment | appointment | waste | internal | other
	UsagePurpose  string    `json:"usage_purpose" db:"usage_purpose"`
	ReferenceID   *string   `json:"reference_id,omitempty" db:"reference_id"`
	ReferenceType *string   `json:"reference_type,omitempty" db:"reference_type"`
	PatientName   *string   `json:"patient_name,omitempty" db:"patient_name"`
	ServiceName   *string   `json:"service_name,omitempty" db:"service_name"`
	Notes         *string   `json:"notes,omitempty" db:"notes"`
	OrganizationID *string  `json:"organization_id,omitempty" db:"organization_id"`
	CreatedBy     *string   `json:"created_by,omitempty" db:"created_by"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}
