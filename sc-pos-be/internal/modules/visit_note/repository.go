package visit_note

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct{}

func NewRepository() *Repository {
	return &Repository{}
}

// Create inserts a new visit note.
func (r *Repository) Create(note *models.VisitNote) error {
	_, err := database.DB.Exec(`
		INSERT INTO visit_notes (
			id, patient_id, appointment_id, visit_date,
			diagnosis, patient_condition_before,
			treatment_performed, treatment_outcome,
			follow_up_notes, next_visit_recommended,
			doctor_id, organization_id, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, note.ID, note.PatientID, note.AppointmentID, note.VisitDate,
		note.Diagnosis, note.PatientConditionBefore,
		note.TreatmentPerformed, note.TreatmentOutcome,
		note.FollowUpNotes, note.NextVisitRecommended,
		note.DoctorID, note.OrganizationID, note.CreatedBy, note.CreatedAt, note.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create visit note: %w", err)
	}
	return nil
}

// GetByID retrieves a single visit note by ID within an org.
func (r *Repository) GetByID(id, orgID string) (*models.VisitNote, error) {
	var n models.VisitNote
	var appointmentID sql.NullString
	var doctorID sql.NullString
	var nextVisit sql.NullTime

	err := database.DB.QueryRow(`
		SELECT id, patient_id, visit_date, diagnosis, patient_condition_before,
		       treatment_performed, treatment_outcome, follow_up_notes, next_visit_recommended,
		       organization_id, created_at, updated_at
		FROM visit_notes
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`, id, orgID).Scan(
		&n.ID, &n.PatientID, &n.VisitDate, &n.Diagnosis, &n.PatientConditionBefore,
		&n.TreatmentPerformed, &n.TreatmentOutcome, &n.FollowUpNotes, &nextVisit,
		&n.OrganizationID, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if appointmentID.Valid {
		n.AppointmentID = &appointmentID.String
	}
	if doctorID.Valid {
		n.DoctorID = &doctorID.String
	}
	if nextVisit.Valid {
		t := nextVisit.Time
		n.NextVisitRecommended = &t
	}
	return &n, nil
}

// ListByPatient returns all visit notes for a patient, newest first.
func (r *Repository) ListByPatient(patientID, orgID string) ([]models.VisitNoteWithDetails, error) {
	rows, err := database.DB.Query(`
		SELECT vn.id, vn.patient_id, vn.appointment_id, vn.visit_date,
		       vn.diagnosis, vn.patient_condition_before,
		       vn.treatment_performed, vn.treatment_outcome,
		       vn.follow_up_notes, vn.next_visit_recommended,
		       vn.doctor_id, vn.organization_id, vn.created_at, vn.updated_at,
		       p.full_name AS patient_name,
		       d.full_name AS doctor_name
		FROM visit_notes vn
		JOIN patients p ON p.id = vn.patient_id
		LEFT JOIN staff d ON d.id = vn.doctor_id AND d.deleted_at IS NULL
		WHERE vn.patient_id = $1 AND vn.organization_id = $2 AND vn.deleted_at IS NULL
		ORDER BY vn.visit_date DESC
	`, patientID, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list visit notes: %w", err)
	}
	defer rows.Close()

	var notes []models.VisitNoteWithDetails
	for rows.Next() {
		var n models.VisitNoteWithDetails
		var appointmentID, doctorID sql.NullString
		var nextVisit sql.NullTime
		var doctorName sql.NullString

		if err := rows.Scan(
			&n.ID, &n.PatientID, &appointmentID, &n.VisitDate,
			&n.Diagnosis, &n.PatientConditionBefore,
			&n.TreatmentPerformed, &n.TreatmentOutcome,
			&n.FollowUpNotes, &nextVisit,
			&doctorID, &n.OrganizationID, &n.CreatedAt, &n.UpdatedAt,
			&n.PatientName, &doctorName,
		); err != nil {
			return nil, err
		}
		if appointmentID.Valid {
			n.AppointmentID = &appointmentID.String
		}
		if doctorID.Valid {
			n.DoctorID = &doctorID.String
		}
		if doctorName.Valid {
			n.DoctorName = &doctorName.String
		}
		if nextVisit.Valid {
			t := nextVisit.Time
			n.NextVisitRecommended = &t
		}
		notes = append(notes, n)
	}
	return notes, nil
}

// Update updates a visit note.
func (r *Repository) Update(id string, n *models.VisitNote) error {
	_, err := database.DB.Exec(`
		UPDATE visit_notes SET
			diagnosis = $2,
			patient_condition_before = $3,
			treatment_performed = $4,
			treatment_outcome = $5,
			follow_up_notes = $6,
			next_visit_recommended = $7,
			doctor_id = $8,
			updated_by = $9,
			updated_at = $10
		WHERE id = $1 AND organization_id = $11 AND deleted_at IS NULL
	`, id, n.Diagnosis, n.PatientConditionBefore,
		n.TreatmentPerformed, n.TreatmentOutcome,
		n.FollowUpNotes, n.NextVisitRecommended,
		n.DoctorID, n.UpdatedBy, time.Now(), n.OrganizationID)
	if err != nil {
		return fmt.Errorf("failed to update visit note: %w", err)
	}
	return nil
}

// Delete soft-deletes a visit note.
func (r *Repository) Delete(id, orgID, userID string) error {
	_, err := database.DB.Exec(`
		UPDATE visit_notes SET deleted_at = $3, updated_by = $4, updated_at = $5
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`, id, orgID, time.Now(), userID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to delete visit note: %w", err)
	}
	return nil
}
