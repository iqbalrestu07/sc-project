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

func (r *Repository) GetAll() ([]models.Patient, error) {
	query := `
		SELECT id, patient_code, full_name, photo_url, date_of_birth, gender, phone,
		       whatsapp, email, address, allergy_history, medical_conditions, skin_type,
		       notes, tags, is_active, created_by, created_at, updated_at
		FROM patients
		WHERE is_active = true
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query patients: %w", err)
	}
	defer rows.Close()

	return scanPatients(rows)
}

func (r *Repository) GetByID(id string) (*models.Patient, error) {
	query := `
		SELECT id, patient_code, full_name, photo_url, date_of_birth, gender, phone,
		       whatsapp, email, address, allergy_history, medical_conditions, skin_type,
		       notes, tags, is_active, created_by, created_at, updated_at
		FROM patients
		WHERE id = $1 AND is_active = true
	`

	var patient models.Patient
	err := r.db.QueryRow(query, id).Scan(
		&patient.ID, &patient.PatientCode, &patient.FullName, &patient.PhotoURL,
		&patient.DateOfBirth, &patient.Gender, &patient.Phone, &patient.WhatsApp,
		&patient.Email, &patient.Address, &patient.AllergyHistory,
		&patient.MedicalConditions, &patient.SkinType, &patient.Notes,
		pq.Array(&patient.Tags), &patient.IsActive, &patient.CreatedBy,
		&patient.CreatedAt, &patient.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query patient: %w", err)
	}

	return &patient, nil
}

func (r *Repository) Create(patient *models.Patient) error {
	query := `
		INSERT INTO patients (id, patient_code, full_name, photo_url, date_of_birth,
		                     gender, phone, whatsapp, email, address, allergy_history,
		                     medical_conditions, skin_type, notes, tags, is_active,
		                     created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
	`

	_, err := r.db.Exec(query,
		patient.ID, patient.PatientCode, patient.FullName, patient.PhotoURL,
		patient.DateOfBirth, patient.Gender, patient.Phone, patient.WhatsApp,
		patient.Email, patient.Address, patient.AllergyHistory,
		patient.MedicalConditions, patient.SkinType, patient.Notes,
		pq.Array(patient.Tags), patient.IsActive, patient.CreatedBy,
		patient.CreatedAt, patient.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create patient: %w", err)
	}

	return nil
}

func (r *Repository) Update(id string, patient *models.Patient) error {
	query := `
		UPDATE patients
		SET full_name = $1, photo_url = $2, date_of_birth = $3, gender = $4,
		    phone = $5, whatsapp = $6, email = $7, address = $8,
		    allergy_history = $9, medical_conditions = $10, skin_type = $11,
		    notes = $12, tags = $13, updated_at = CURRENT_TIMESTAMP
		WHERE id = $14 AND is_active = true
	`

	result, err := r.db.Exec(query,
		patient.FullName, patient.PhotoURL, patient.DateOfBirth, patient.Gender,
		patient.Phone, patient.WhatsApp, patient.Email, patient.Address,
		patient.AllergyHistory, patient.MedicalConditions, patient.SkinType,
		patient.Notes, pq.Array(patient.Tags), id,
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

func (r *Repository) Delete(id string) error {
	query := `
		UPDATE patients
		SET is_active = false, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND is_active = true
	`

	result, err := r.db.Exec(query, id)
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

func (r *Repository) Search(query string) ([]models.Patient, error) {
	sqlQuery := `
		SELECT id, patient_code, full_name, photo_url, date_of_birth, gender, phone,
		       whatsapp, email, address, allergy_history, medical_conditions, skin_type,
		       notes, tags, is_active, created_by, created_at, updated_at
		FROM patients
		WHERE is_active = true AND (
			full_name ILIKE $1 OR
			phone ILIKE $1 OR
			patient_code ILIKE $1
		)
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(sqlQuery, "%"+query+"%")
	if err != nil {
		return nil, fmt.Errorf("failed to search patients: %w", err)
	}
	defer rows.Close()

	return scanPatients(rows)
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
			pq.Array(&patient.Tags), &patient.IsActive, &patient.CreatedBy,
			&patient.CreatedAt, &patient.UpdatedAt,
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
