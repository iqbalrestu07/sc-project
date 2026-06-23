package models

import "time"

// Appointment represents scheduled appointments
type Appointment struct {
	ID              string     `json:"id" db:"id"`
	PatientID       string     `json:"patient_id" db:"patient_id"`
	ServiceID       string     `json:"service_id" db:"service_id"`
	DoctorID        *string    `json:"doctor_id" db:"doctor_id"`
	TherapistID     *string    `json:"therapist_id" db:"therapist_id"`
	ScheduledAt     time.Time  `json:"scheduled_at" db:"scheduled_at"`
	DurationMinutes *int       `json:"duration_minutes" db:"duration_minutes"`
	Status          string     `json:"status" db:"status"` // pending, confirmed, completed, cancelled
	Notes           *string    `json:"notes" db:"notes"`
	CreatedBy       *string    `json:"created_by" db:"created_by"`
	UpdatedBy       *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}
