package models

import "time"

// Service represents clinic service/treatment
type Service struct {
	ID                       string           `json:"id" db:"id"`
	Name                     string           `json:"name" db:"name"`
	CategoryID               *string          `json:"category_id" db:"category_id"`
	Description              *string          `json:"description" db:"description"`
	DurationMinutes          int              `json:"duration_minutes" db:"duration_minutes"`
	BasePrice                float64          `json:"base_price" db:"base_price"`
	DoctorCommissionType     string           `json:"doctor_commission_type" db:"doctor_commission_type"` // percentage, fixed
	DoctorCommissionValue    float64          `json:"doctor_commission_value" db:"doctor_commission_value"`
	TherapistCommissionType  string           `json:"therapist_commission_type" db:"therapist_commission_type"`
	TherapistCommissionValue float64          `json:"therapist_commission_value" db:"therapist_commission_value"`
	RequiresDoctor           bool             `json:"requires_doctor" db:"requires_doctor"`
	IsActive                 bool             `json:"is_active" db:"is_active"`
	CreatedBy                *string          `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy                *string          `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt                *time.Time       `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt                time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt                time.Time        `json:"updated_at" db:"updated_at"`
	Category                 *ServiceCategory `json:"category,omitempty" db:"-"`
}

// ServiceCategory represents service categories
type ServiceCategory struct {
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
