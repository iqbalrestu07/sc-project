package patient

import (
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

const selectColumns = `
	id, patient_code, full_name, photo_url, date_of_birth, gender, phone,
	whatsapp, email, address, allergy_history, medical_conditions, skin_type,
	notes, tags, is_active, reminder_opt_in, created_by, created_at, updated_at`

func (r *Repository) GetAll(orgID string) ([]models.Patient, error) {
	query := `SELECT` + selectColumns + `
		FROM patients
		WHERE is_active = true
		  AND deleted_at IS NULL
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		ORDER BY created_at DESC`

	rows, err := r.db.Query(query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query patients: %w", err)
	}
	defer rows.Close()

	return scanPatients(rows)
}

func (r *Repository) GetByID(id, orgID string) (*models.Patient, error) {
	query := `SELECT` + selectColumns + `
		FROM patients
		WHERE id = $1 AND is_active = true
		  AND deleted_at IS NULL
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))`

	var patient models.Patient
	err := r.db.QueryRow(query, id, orgID).Scan(
		&patient.ID, &patient.PatientCode, &patient.FullName, &patient.PhotoURL,
		&patient.DateOfBirth, &patient.Gender, &patient.Phone, &patient.WhatsApp,
		&patient.Email, &patient.Address, &patient.AllergyHistory,
		&patient.MedicalConditions, &patient.SkinType, &patient.Notes,
		pq.Array(&patient.Tags), &patient.IsActive, &patient.ReminderOptIn,
		&patient.CreatedBy, &patient.CreatedAt, &patient.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query patient: %w", err)
	}

	return &patient, nil
}

func (r *Repository) Create(patient *models.Patient, orgID string) error {
	query := `
		INSERT INTO patients (id, patient_code, full_name, photo_url, date_of_birth,
		                     gender, phone, whatsapp, email, address, allergy_history,
		                     medical_conditions, skin_type, notes, tags, is_active,
		                     reminder_opt_in, created_by, created_at, updated_at,
		                     organization_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`

	_, err := r.db.Exec(query,
		patient.ID, patient.PatientCode, patient.FullName, patient.PhotoURL,
		patient.DateOfBirth, patient.Gender, patient.Phone, patient.WhatsApp,
		patient.Email, patient.Address, patient.AllergyHistory,
		patient.MedicalConditions, patient.SkinType, patient.Notes,
		pq.Array(patient.Tags), patient.IsActive, patient.ReminderOptIn,
		patient.CreatedBy, patient.CreatedAt, patient.UpdatedAt,
		nullableString(orgID),
	)
	if err != nil {
		return fmt.Errorf("failed to create patient: %w", err)
	}

	return nil
}

func (r *Repository) Update(id string, patient *models.Patient, orgID string) error {
	var updatedByVal interface{}
	if patient.UpdatedBy != nil {
		updatedByVal = *patient.UpdatedBy
	}
	query := `
		UPDATE patients
		SET full_name = $1, photo_url = $2, date_of_birth = $3, gender = $4,
		    phone = $5, whatsapp = $6, email = $7, address = $8,
		    allergy_history = $9, medical_conditions = $10, skin_type = $11,
		    notes = $12, tags = $13, reminder_opt_in = $14,
		    updated_by = $15, updated_at = NOW()
		WHERE id = $16
		  AND (organization_id = $17 OR ($17::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`

	result, err := r.db.Exec(query,
		patient.FullName, patient.PhotoURL, patient.DateOfBirth, patient.Gender,
		patient.Phone, patient.WhatsApp, patient.Email, patient.Address,
		patient.AllergyHistory, patient.MedicalConditions, patient.SkinType,
		patient.Notes, pq.Array(patient.Tags), patient.ReminderOptIn,
		updatedByVal, id, nullableString(orgID),
	)
	if err != nil {
		return fmt.Errorf("failed to update patient: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *Repository) Delete(id, orgID, userByID string) error {
	var userVal interface{}
	if userByID != "" {
		userVal = userByID
	}
	result, err := r.db.Exec(`
		UPDATE patients
		SET deleted_at = NOW(), is_active = false, updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, nullableString(orgID), userVal)
	if err != nil {
		return fmt.Errorf("failed to delete patient: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *Repository) Search(query, orgID string) ([]models.Patient, error) {
	sqlQuery := `SELECT` + selectColumns + `
		FROM patients
		WHERE is_active = true AND deleted_at IS NULL AND (
			full_name ILIKE $1 OR
			phone ILIKE $1 OR
			patient_code ILIKE $1
		)
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		ORDER BY created_at DESC`

	rows, err := r.db.Query(sqlQuery, "%"+query+"%", orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to search patients: %w", err)
	}
	defer rows.Close()

	return scanPatients(rows)
}

// VisitSummary is a condensed appointment record for patient history
type VisitSummary struct {
	ID            string  `json:"id"`
	ScheduledAt   string  `json:"scheduled_at"`
	Status        string  `json:"status"`
	ServiceName   string  `json:"service_name"`
	DoctorName    *string `json:"doctor_name,omitempty"`
	TherapistName *string `json:"therapist_name,omitempty"`
	Notes         *string `json:"notes,omitempty"`
}

// TransactionSummary is a condensed transaction record for patient history
type TransactionSummary struct {
	ID              string  `json:"id"`
	TransactionCode string  `json:"transaction_code"`
	TotalAmount     float64 `json:"total_amount"`
	PaymentStatus   string  `json:"payment_status"`
	PaymentMethod   *string `json:"payment_method,omitempty"`
	PaidAt          *string `json:"paid_at,omitempty"`
	CreatedAt       string  `json:"created_at"`
	DoctorName      *string `json:"doctor_name,omitempty"`
	TherapistName   *string `json:"therapist_name,omitempty"`
}

func (r *Repository) GetVisits(patientID string) ([]VisitSummary, error) {
	rows, err := r.db.Query(`
		SELECT a.id, a.scheduled_at, a.status,
		       COALESCE(s.name, '') AS service_name,
		       d.full_name AS doctor_name,
		       th.full_name AS therapist_name,
		       a.notes
		FROM appointments a
		LEFT JOIN services s ON s.id = a.service_id
		LEFT JOIN staff d ON d.id = a.doctor_id
		LEFT JOIN staff th ON th.id = a.therapist_id
		WHERE a.patient_id = $1
		  AND a.deleted_at IS NULL
		ORDER BY a.scheduled_at DESC
		LIMIT 100
	`, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to query patient visits: %w", err)
	}
	defer rows.Close()

	var visits []VisitSummary
	for rows.Next() {
		var v VisitSummary
		var doctorName sql.NullString
		var therapistName sql.NullString
		var notes sql.NullString
		var scheduledAt sql.NullTime
		if err := rows.Scan(&v.ID, &scheduledAt, &v.Status, &v.ServiceName, &doctorName, &therapistName, &notes); err != nil {
			return nil, fmt.Errorf("failed to scan visit: %w", err)
		}
		if scheduledAt.Valid {
			v.ScheduledAt = scheduledAt.Time.Format("2006-01-02T15:04:05Z")
		}
		if doctorName.Valid {
			v.DoctorName = &doctorName.String
		}
		if therapistName.Valid {
			v.TherapistName = &therapistName.String
		}
		if notes.Valid {
			v.Notes = &notes.String
		}
		visits = append(visits, v)
	}
	if visits == nil {
		visits = []VisitSummary{}
	}
	return visits, nil
}

func (r *Repository) GetTransactions(patientID string) ([]TransactionSummary, error) {
	rows, err := r.db.Query(`
		SELECT t.id, t.transaction_code, t.total_amount, t.payment_status,
		       t.payment_method, t.paid_at, t.created_at,
		       COALESCE(string_agg(DISTINCT d.full_name, ', '), '') AS doctor_names,
		       COALESCE(string_agg(DISTINCT th.full_name, ', '), '') AS therapist_names
		FROM transactions t
		LEFT JOIN transaction_items ti ON ti.transaction_id = t.id AND ti.deleted_at IS NULL
		LEFT JOIN staff d ON d.id = ti.doctor_id
		LEFT JOIN staff th ON th.id = ti.therapist_id
		WHERE t.patient_id = $1
		  AND t.deleted_at IS NULL
		GROUP BY t.id, t.transaction_code, t.total_amount, t.payment_status,
		         t.payment_method, t.paid_at, t.created_at
		ORDER BY t.created_at DESC
		LIMIT 100
	`, patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to query patient transactions: %w", err)
	}
	defer rows.Close()

	var txns []TransactionSummary
	for rows.Next() {
		var t TransactionSummary
		var paymentMethod sql.NullString
		var paidAt sql.NullTime
		var createdAt sql.NullTime
		var doctorNames sql.NullString
		var therapistNames sql.NullString
		if err := rows.Scan(&t.ID, &t.TransactionCode, &t.TotalAmount, &t.PaymentStatus,
			&paymentMethod, &paidAt, &createdAt, &doctorNames, &therapistNames); err != nil {
			return nil, fmt.Errorf("failed to scan transaction: %w", err)
		}
		if paymentMethod.Valid {
			t.PaymentMethod = &paymentMethod.String
		}
		if paidAt.Valid {
			s := paidAt.Time.Format("2006-01-02T15:04:05Z")
			t.PaidAt = &s
		}
		if createdAt.Valid {
			t.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}
		if doctorNames.Valid && doctorNames.String != "" {
			t.DoctorName = &doctorNames.String
		}
		if therapistNames.Valid && therapistNames.String != "" {
			t.TherapistName = &therapistNames.String
		}
		txns = append(txns, t)
	}
	if txns == nil {
		txns = []TransactionSummary{}
	}
	return txns, nil
}

// nullableString converts an empty string to nil so it inserts as SQL NULL.
func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func scanPatients(rows *sql.Rows) ([]models.Patient, error) {
	var patients []models.Patient
	for rows.Next() {
		var patient models.Patient
		err := rows.Scan(
			&patient.ID, &patient.PatientCode, &patient.FullName, &patient.PhotoURL,
			&patient.DateOfBirth, &patient.Gender, &patient.Phone, &patient.WhatsApp,
			&patient.Email, &patient.Address, &patient.AllergyHistory,
			&patient.MedicalConditions, &patient.SkinType, &patient.Notes,
			pq.Array(&patient.Tags), &patient.IsActive, &patient.ReminderOptIn,
			&patient.CreatedBy, &patient.CreatedAt, &patient.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan patient: %w", err)
		}
		patients = append(patients, patient)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read patients: %w", err)
	}

	if patients == nil {
		patients = []models.Patient{}
	}

	return patients, nil
}
