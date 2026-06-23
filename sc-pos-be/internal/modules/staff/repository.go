package staff

import (
	"database/sql"
	"fmt"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) List(orgID string) ([]models.Staff, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, full_name, role, phone, email, specialization,
		       COALESCE(is_active, true), created_at, updated_at
		FROM staff
		WHERE COALESCE(is_active, true) = true
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		ORDER BY full_name ASC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query staff: %w", err)
	}
	defer rows.Close()

	var staffList []models.Staff
	for rows.Next() {
		staff, err := scanStaff(rows)
		if err != nil {
			return nil, err
		}
		staffList = append(staffList, staff)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read staff: %w", err)
	}
	if staffList == nil {
		staffList = []models.Staff{}
	}
	return staffList, nil
}

func (r *Repository) Get(id, orgID string) (*models.Staff, error) {
	row := r.db.QueryRow(`
		SELECT id, user_id, full_name, role, phone, email, specialization,
		       COALESCE(is_active, true), created_at, updated_at
		FROM staff
		WHERE id = $1 AND COALESCE(is_active, true) = true
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
	`, id, orgID)
	staff, err := scanStaff(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &staff, nil
}

func (r *Repository) GetByUserID(userID string) (*models.Staff, error) {
	row := r.db.QueryRow(`
		SELECT id, user_id, full_name, role, phone, email, specialization,
		       COALESCE(is_active, true), created_at, updated_at
		FROM staff
		WHERE user_id = $1 AND COALESCE(is_active, true) = true
	`, userID)
	staff, err := scanStaff(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &staff, nil
}

func (r *Repository) Create(staff *models.Staff, orgID string) error {
	var orgVal interface{}
	if orgID != "" {
		orgVal = orgID
	}
	_, err := r.db.Exec(`
		INSERT INTO staff (id, user_id, full_name, role, phone, email, specialization, is_active, organization_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, staff.ID, staff.UserID, staff.FullName, staff.Role, staff.Phone, staff.Email, staff.Specialization, staff.IsActive, orgVal, staff.CreatedAt, staff.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create staff: %w", err)
	}
	return nil
}

func (r *Repository) Update(id string, staff *models.Staff) error {
	result, err := r.db.Exec(`
		UPDATE staff
		SET user_id = $1, full_name = $2, role = $3, phone = $4, email = $5,
		    specialization = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND COALESCE(is_active, true) = true
	`, staff.UserID, staff.FullName, staff.Role, staff.Phone, staff.Email, staff.Specialization, id)
	if err != nil {
		return fmt.Errorf("failed to update staff: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id string) error {
	result, err := r.db.Exec(`UPDATE staff SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND COALESCE(is_active, true) = true`, id)
	if err != nil {
		return fmt.Errorf("failed to delete staff: %w", err)
	}
	return checkRows(result)
}

type staffScanner interface {
	Scan(dest ...interface{}) error
}

func scanStaff(scanner staffScanner) (models.Staff, error) {
	var staff models.Staff
	err := scanner.Scan(
		&staff.ID, &staff.UserID, &staff.FullName, &staff.Role, &staff.Phone,
		&staff.Email, &staff.Specialization, &staff.IsActive, &staff.CreatedAt, &staff.UpdatedAt,
	)
	if err != nil {
		return models.Staff{}, err
	}
	return staff, nil
}

func checkRows(result sql.Result) error {
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
