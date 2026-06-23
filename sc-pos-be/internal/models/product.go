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
	ID            string     `json:"id" db:"id"`
	Name          string     `json:"name" db:"name"`
	Category      *string    `json:"category" db:"category"`
	Sku           *string    `json:"sku" db:"sku"`
	Supplier      *string    `json:"supplier" db:"supplier"`
	PurchasePrice *float64   `json:"purchase_price" db:"purchase_price"`
	SellingPrice  *float64   `json:"selling_price" db:"selling_price"`
	CurrentStock  int        `json:"current_stock" db:"current_stock"`
	MinimumStock  int        `json:"minimum_stock" db:"minimum_stock"`
	Unit          *string    `json:"unit" db:"unit"`
	ExpiryDate    *time.Time `json:"expiry_date" db:"expiry_date"`
	IsActive      bool       `json:"is_active" db:"is_active"`
	CreatedBy     *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy     *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}
