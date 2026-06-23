package service

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

func (r *Repository) List(search, orgID string) ([]models.Service, error) {
	query := `
		SELECT s.id, s.name, s.category_id, s.description, s.duration_minutes,
		       s.base_price, COALESCE(s.doctor_commission_type, 'fixed'),
		       COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'),
		       COALESCE(s.therapist_commission_value, 0),
		       COALESCE(s.requires_doctor, false), COALESCE(s.is_active, true),
		       s.created_at, s.updated_at,
		       c.id, c.name, c.description, COALESCE(c.is_active, true), c.created_at, c.updated_at
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		WHERE COALESCE(s.is_active, true) = true
		  AND ($1 = '' OR s.name ILIKE '%' || $1 || '%' OR COALESCE(s.description, '') ILIKE '%' || $1 || '%')
		  AND (s.organization_id = $2 OR ($2::text = '' AND s.organization_id IS NULL))
		ORDER BY s.name ASC
	`
	rows, err := r.db.Query(query, search, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query services: %w", err)
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		service, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		services = append(services, service)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read services: %w", err)
	}
	if services == nil {
		services = []models.Service{}
	}
	return services, nil
}

func (r *Repository) Get(id, orgID string) (*models.Service, error) {
	query := `
		SELECT s.id, s.name, s.category_id, s.description, s.duration_minutes, s.base_price,
		       COALESCE(s.doctor_commission_type, 'fixed'), COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'), COALESCE(s.therapist_commission_value, 0),
		       COALESCE(s.requires_doctor, false), COALESCE(s.is_active, true), s.created_at, s.updated_at,
		       c.id, c.name, c.description, COALESCE(c.is_active, true), c.created_at, c.updated_at
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		WHERE s.id = $1 AND COALESCE(s.is_active, true) = true
		  AND (s.organization_id = $2 OR ($2::text = '' AND s.organization_id IS NULL))
	`
	row := r.db.QueryRow(query, id, orgID)
	service, err := scanService(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &service, nil
}

func (r *Repository) Create(service *models.Service, orgID string) error {
	query := `
		INSERT INTO services (
			id, name, category_id, description, duration_minutes, base_price,
			doctor_commission_type, doctor_commission_value,
			therapist_commission_type, therapist_commission_value,
			requires_doctor, is_active, created_at, updated_at,
			organization_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	if _, err := r.db.Exec(query, service.ID, service.Name, service.CategoryID, service.Description,
		service.DurationMinutes, service.BasePrice, service.DoctorCommissionType,
		service.DoctorCommissionValue, service.TherapistCommissionType,
		service.TherapistCommissionValue, service.RequiresDoctor, service.IsActive,
		service.CreatedAt, service.UpdatedAt, nullableString(orgID)); err != nil {
		return fmt.Errorf("failed to create service: %w", err)
	}
	return nil
}

func (r *Repository) Update(id string, service *models.Service) error {
	query := `
		UPDATE services
		SET name = $1, category_id = $2, description = $3, duration_minutes = $4,
		    base_price = $5, doctor_commission_type = $6, doctor_commission_value = $7,
		    therapist_commission_type = $8, therapist_commission_value = $9,
		    requires_doctor = $10, updated_at = CURRENT_TIMESTAMP
		WHERE id = $11 AND COALESCE(is_active, true) = true
	`
	result, err := r.db.Exec(query, service.Name, service.CategoryID, service.Description,
		service.DurationMinutes, service.BasePrice, service.DoctorCommissionType,
		service.DoctorCommissionValue, service.TherapistCommissionType,
		service.TherapistCommissionValue, service.RequiresDoctor, id)
	if err != nil {
		return fmt.Errorf("failed to update service: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id string) error {
	result, err := r.db.Exec(`UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND COALESCE(is_active, true) = true`, id)
	if err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) ListCategories(orgID string) ([]models.ServiceCategory, error) {
	rows, err := r.db.Query(`
		SELECT id, name, description, COALESCE(is_active, true), created_at, updated_at
		FROM service_categories
		WHERE COALESCE(is_active, true) = true
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		ORDER BY name ASC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query service categories: %w", err)
	}
	defer rows.Close()

	var categories []models.ServiceCategory
	for rows.Next() {
		var category models.ServiceCategory
		if err := rows.Scan(&category.ID, &category.Name, &category.Description, &category.IsActive, &category.CreatedAt, &category.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan service category: %w", err)
		}
		categories = append(categories, category)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read service categories: %w", err)
	}
	if categories == nil {
		categories = []models.ServiceCategory{}
	}
	return categories, nil
}

func (r *Repository) CreateCategory(category *models.ServiceCategory, orgID string) error {
	_, err := r.db.Exec(`
		INSERT INTO service_categories (id, name, description, is_active, created_at, updated_at, organization_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, category.ID, category.Name, category.Description, category.IsActive, category.CreatedAt, category.UpdatedAt, nullableString(orgID))
	if err != nil {
		return fmt.Errorf("failed to create service category: %w", err)
	}
	return nil
}

func (r *Repository) UpdateCategory(id string, category *models.ServiceCategory) error {
	result, err := r.db.Exec(`
		UPDATE service_categories
		SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND COALESCE(is_active, true) = true
	`, category.Name, category.Description, id)
	if err != nil {
		return fmt.Errorf("failed to update service category: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) DeleteCategory(id string) error {
	result, err := r.db.Exec(`
		UPDATE service_categories SET is_active = false, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND COALESCE(is_active, true) = true
	`, id)
	if err != nil {
		return fmt.Errorf("failed to delete service category: %w", err)
	}
	return checkRows(result)
}

type serviceScanner interface {
	Scan(dest ...interface{}) error
}

func scanService(scanner serviceScanner) (models.Service, error) {
	var service models.Service
	var category models.ServiceCategory
	var categoryID, categoryName sql.NullString
	var categoryDescription sql.NullString
	var categoryIsActive sql.NullBool
	var categoryCreatedAt, categoryUpdatedAt sql.NullTime
	err := scanner.Scan(
		&service.ID, &service.Name, &service.CategoryID, &service.Description,
		&service.DurationMinutes, &service.BasePrice, &service.DoctorCommissionType,
		&service.DoctorCommissionValue, &service.TherapistCommissionType,
		&service.TherapistCommissionValue, &service.RequiresDoctor, &service.IsActive,
		&service.CreatedAt, &service.UpdatedAt, &categoryID, &categoryName,
		&categoryDescription, &categoryIsActive, &categoryCreatedAt, &categoryUpdatedAt,
	)
	if err != nil {
		return models.Service{}, err
	}
	if categoryID.Valid {
		category.ID = categoryID.String
		category.Name = categoryName.String
		if categoryDescription.Valid {
			category.Description = &categoryDescription.String
		}
		category.IsActive = categoryIsActive.Bool
		category.CreatedAt = categoryCreatedAt.Time
		category.UpdatedAt = categoryUpdatedAt.Time
		service.Category = &category
	}
	return service, nil
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

// nullableString converts an empty string to nil so it inserts as SQL NULL.
func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
