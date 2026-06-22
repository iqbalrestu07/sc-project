package models

import "time"

// Staff represents clinic staff members
type Staff struct {
	ID             string    `json:"id" db:"id"`
	UserID         *string   `json:"user_id" db:"user_id"`
	FullName       string    `json:"full_name" db:"full_name"`
	Role           string    `json:"role" db:"role"` // doctor, therapist, cashier
	Phone          *string   `json:"phone" db:"phone"`
	Email          *string   `json:"email" db:"email"`
	Specialization *string   `json:"specialization" db:"specialization"`
	IsActive       bool      `json:"is_active" db:"is_active"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
