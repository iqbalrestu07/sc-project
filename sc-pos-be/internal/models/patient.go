package models

import "time"

// Patient represents clinic patient
type Patient struct {
	ID                string       `json:"id" db:"id"`
	PatientCode       string       `json:"patient_code" db:"patient_code"`
	FullName          string       `json:"full_name" db:"full_name"`
	PhotoURL          *string      `json:"photo_url" db:"photo_url"`
	DateOfBirth       NullableTime `json:"date_of_birth" db:"date_of_birth"`
	Gender            *string      `json:"gender" db:"gender"` // male, female, other
	Phone             *string      `json:"phone" db:"phone"`
	WhatsApp          *string      `json:"whatsapp" db:"whatsapp"`
	Email             *string      `json:"email" db:"email"`
	Address           *string      `json:"address" db:"address"`
	AllergyHistory    *string      `json:"allergy_history" db:"allergy_history"`
	MedicalConditions *string      `json:"medical_conditions" db:"medical_conditions"`
	SkinType          *string      `json:"skin_type" db:"skin_type"`
	Notes             *string      `json:"notes" db:"notes"`
	Tags              []string     `json:"tags" db:"tags"`
	IsActive          bool         `json:"is_active" db:"is_active"`
	ReminderOptIn     *bool        `json:"reminder_opt_in" db:"reminder_opt_in"`
	CreatedBy         *string      `json:"created_by" db:"created_by"`
	UpdatedBy         *string      `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt         *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt         time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at" db:"updated_at"`
}
