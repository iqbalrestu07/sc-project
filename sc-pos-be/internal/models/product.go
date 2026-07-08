package models

import "time"

// ProductCategory represents product categories
type ProductCategory struct {
	ID          string     `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	Description *string    `json:"description" db:"description"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedBy   *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy   *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// Product represents sellable products
type Product struct {
	ID                 string       `json:"id" db:"id"`
	Name               string       `json:"name" db:"name"`
	Category           *string      `json:"category" db:"category"`
	Sku                *string      `json:"sku" db:"sku"`
	Supplier           *string      `json:"supplier" db:"supplier"`
	PurchasePrice      *float64     `json:"purchase_price" db:"purchase_price"`
	SellingPrice       *float64     `json:"selling_price" db:"selling_price"`
	CurrentStock       int          `json:"current_stock" db:"current_stock"`
	MinimumStock       int          `json:"minimum_stock" db:"minimum_stock"`
	Unit               *string      `json:"unit" db:"unit"`
	ExpiryDate         NullableTime `json:"expiry_date" db:"expiry_date"`
	IsActive           bool         `json:"is_active" db:"is_active"`
	IsConsumable       bool         `json:"is_consumable" db:"is_consumable"`
	ConsumableCategory *string      `json:"consumable_category,omitempty" db:"consumable_category"`
	// Handling commission: diberikan saat staff assigned sebagai PIC (selalu)
	DoctorCommissionType     *string  `json:"doctor_commission_type,omitempty" db:"doctor_commission_type"`
	DoctorCommissionValue    *float64 `json:"doctor_commission_value,omitempty" db:"doctor_commission_value"`
	TherapistCommissionType  *string  `json:"therapist_commission_type,omitempty" db:"therapist_commission_type"`
	TherapistCommissionValue *float64 `json:"therapist_commission_value,omitempty" db:"therapist_commission_value"`
	// Offering commission: diberikan saat staff menawarkan dan pasien setuju (opsional)
	DoctorOfferingCommissionType     *string    `json:"doctor_offering_commission_type,omitempty" db:"doctor_offering_commission_type"`
	DoctorOfferingCommissionValue    *float64   `json:"doctor_offering_commission_value,omitempty" db:"doctor_offering_commission_value"`
	TherapistOfferingCommissionType  *string    `json:"therapist_offering_commission_type,omitempty" db:"therapist_offering_commission_type"`
	TherapistOfferingCommissionValue *float64   `json:"therapist_offering_commission_value,omitempty" db:"therapist_offering_commission_value"`
	CreatedBy                        *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy                        *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt                        *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt                        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt                        time.Time  `json:"updated_at" db:"updated_at"`
}
