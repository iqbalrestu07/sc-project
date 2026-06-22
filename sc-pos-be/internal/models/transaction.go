package models

import "time"

// Transaction represents sales transactions
type Transaction struct {
	ID              string     `json:"id" db:"id"`
	TransactionCode string     `json:"transaction_code" db:"transaction_code"`
	AppointmentID   *string    `json:"appointment_id" db:"appointment_id"`
	PatientID       *string    `json:"patient_id" db:"patient_id"`
	Subtotal        float64    `json:"subtotal" db:"subtotal"`
	DiscountAmount  *float64   `json:"discount_amount" db:"discount_amount"`
	DiscountType    *string    `json:"discount_type" db:"discount_type"`
	TotalAmount     float64    `json:"total_amount" db:"total_amount"`
	TaxAmount       float64    `json:"tax_amount" db:"tax_amount"`
	PaymentMethod   *string    `json:"payment_method" db:"payment_method"` // cash, card, transfer, qris
	PaymentStatus   string     `json:"payment_status" db:"payment_status"` // pending, paid, partial, refunded
	Notes           *string    `json:"notes" db:"notes"`
	CreatedBy       *string    `json:"created_by" db:"created_by"`
	PaidAt          *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// TransactionItem represents items in a transaction
type TransactionItem struct {
	ID             string    `json:"id" db:"id"`
	TransactionID  string    `json:"transaction_id" db:"transaction_id"`
	ItemType       string    `json:"item_type" db:"item_type"`
	ServiceID      *string   `json:"service_id" db:"service_id"`
	ProductID      *string   `json:"product_id" db:"product_id"`
	Quantity       int       `json:"quantity" db:"quantity"`
	UnitPrice      float64   `json:"unit_price" db:"unit_price"`
	DiscountAmount *float64  `json:"discount_amount" db:"discount_amount"`
	TotalPrice     float64   `json:"total_price" db:"total_price"`
	DoctorID       *string   `json:"doctor_id" db:"doctor_id"`
	TherapistID    *string   `json:"therapist_id" db:"therapist_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}
