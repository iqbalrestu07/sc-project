package models

import "time"

// VisitNote is a medical record entry for a single patient visit.
//
// A visit note captures the clinical narrative around a visit:
//   - Pre-treatment:  diagnosis + patient condition before any procedure
//   - Post-treatment: what was done + outcome / result
//   - Follow-up:      recommendations for the next visit
//
// Visit notes are independent of appointments — a walk-in patient
// (no appointment) can still have a visit note. When an appointment
// exists, the appointment_id links them together.
type VisitNote struct {
	ID                    string     `json:"id" db:"id"`
	PatientID             string     `json:"patient_id" db:"patient_id"`
	AppointmentID         *string    `json:"appointment_id,omitempty" db:"appointment_id"`         // nullable — walk-in patients have no appointment
	VisitDate             time.Time  `json:"visit_date" db:"visit_date"`                            // when the patient visited
	Diagnosis             *string    `json:"diagnosis,omitempty" db:"diagnosis"`                   // pre-treatment: diagnosis
	PatientConditionBefore *string   `json:"patient_condition_before,omitempty" db:"patient_condition_before"` // pre-treatment: kondisi pasien sebelum tindakan
	TreatmentPerformed    *string    `json:"treatment_performed,omitempty" db:"treatment_performed"` // post-treatment: tindakan yang dilakukan
	TreatmentOutcome      *string    `json:"treatment_outcome,omitempty" db:"treatment_outcome"`     // post-treatment: hasil tindakan
	FollowUpNotes         *string    `json:"follow_up_notes,omitempty" db:"follow_up_notes"`         // rekomendasi kunjungan berikutnya
	NextVisitRecommended  *time.Time `json:"next_visit_recommended,omitempty" db:"next_visit_recommended"` // tanggal rekomendasi follow-up
	DoctorID              *string    `json:"doctor_id,omitempty" db:"doctor_id"`                    // staff yang menangani (optional)
	OrganizationID        string     `json:"organization_id" db:"organization_id"`
	CreatedBy             *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy             *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt             *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

// VisitNoteWithDetails is a VisitNote with joined fields for display.
type VisitNoteWithDetails struct {
	VisitNote
	PatientName  string  `json:"patient_name" db:"patient_name"`
	DoctorName   *string `json:"doctor_name,omitempty" db:"doctor_name"`
	CreatedByName *string `json:"created_by_name,omitempty" db:"created_by_name"`
}
