package service

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) List(search, orgID string, page, limit int) ([]models.Service, bool, error) {
	offset := (page - 1) * limit
	fetchLimit := limit + 1

	query := `
		SELECT s.id, s.name, s.category_id, s.description, s.duration_minutes,
		       s.base_price, COALESCE(s.doctor_commission_type, 'fixed'),
		       COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'),
		       COALESCE(s.therapist_commission_value, 0),
		       s.doctor_offering_commission_type, s.doctor_offering_commission_value,
		       s.therapist_offering_commission_type, s.therapist_offering_commission_value,
		       s.offering_price,
		       COALESCE(s.requires_doctor, false), COALESCE(s.is_active, true),
		       s.created_at, s.updated_at,
		       c.id, c.name, c.description, COALESCE(c.is_active, true), c.created_at, c.updated_at
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		WHERE COALESCE(s.is_active, true) = true
		  AND ($1 = '' OR s.name ILIKE '%' || $1 || '%' OR COALESCE(s.description, '') ILIKE '%' || $1 || '%')
		  AND (s.organization_id = $2 OR ($2::text = '' AND s.organization_id IS NULL))
		  AND s.deleted_at IS NULL
		ORDER BY s.name ASC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.db.Query(query, search, orgID, fetchLimit, offset)
	if err != nil {
		return nil, false, fmt.Errorf("failed to query services: %w", err)
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		service, err := scanService(rows)
		if err != nil {
			return nil, false, err
		}
		services = append(services, service)
	}
	if err := rows.Err(); err != nil {
		return nil, false, fmt.Errorf("failed to read services: %w", err)
	}
	if services == nil {
		services = []models.Service{}
	}

	hasNext := len(services) > limit
	if hasNext {
		services = services[:limit]
	}

	return services, hasNext, nil
}

func (r *Repository) Get(id, orgID string) (*models.Service, error) {
	query := `
		SELECT s.id, s.name, s.category_id, s.description, s.duration_minutes, s.base_price,
		       COALESCE(s.doctor_commission_type, 'fixed'), COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'), COALESCE(s.therapist_commission_value, 0),
		       s.doctor_offering_commission_type, s.doctor_offering_commission_value,
		       s.therapist_offering_commission_type, s.therapist_offering_commission_value,
		       s.offering_price,
		       COALESCE(s.requires_doctor, false), COALESCE(s.is_active, true), s.created_at, s.updated_at,
		       c.id, c.name, c.description, COALESCE(c.is_active, true), c.created_at, c.updated_at
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		WHERE s.id = $1 AND COALESCE(s.is_active, true) = true
		  AND (s.organization_id = $2 OR ($2::text = '' AND s.organization_id IS NULL))
		  AND s.deleted_at IS NULL
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

func (r *Repository) GetByName(name, orgID string) (*models.Service, error) {
	query := `
		SELECT s.id, s.name, s.category_id, s.description, s.duration_minutes, s.base_price,
		       COALESCE(s.doctor_commission_type, 'fixed'), COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'), COALESCE(s.therapist_commission_value, 0),
		       s.doctor_offering_commission_type, s.doctor_offering_commission_value,
		       s.therapist_offering_commission_type, s.therapist_offering_commission_value,
		       s.offering_price,
		       COALESCE(s.requires_doctor, false), COALESCE(s.is_active, true), s.created_at, s.updated_at,
		       c.id, c.name, c.description, COALESCE(c.is_active, true), c.created_at, c.updated_at
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		WHERE LOWER(s.name) = LOWER($1) AND COALESCE(s.is_active, true) = true
		  AND (s.organization_id = $2 OR ($2::text = '' AND s.organization_id IS NULL))
		  AND s.deleted_at IS NULL
		LIMIT 1
	`
	row := r.db.QueryRow(query, name, orgID)
	service, err := scanService(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &service, nil
}

// GetByNames fetches multiple services by name in a single query.
// Returns a map of lower(name) → *models.Service for fast lookup.
// This avoids N separate GetByName round-trips during bulk import.
func (r *Repository) GetByNames(names []string, orgID string) (map[string]*models.Service, error) {
	if len(names) == 0 {
		return map[string]*models.Service{}, nil
	}
	args := make([]interface{}, 0, len(names)+1)
	for _, n := range names {
		args = append(args, strings.ToLower(n))
	}
	args = append(args, orgID)
	placeholders := ""
	for i := range names {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+1)
	}
	orgParamIdx := len(names) + 1

	query := fmt.Sprintf(`
		SELECT s.id, s.name, s.category_id, s.description, s.duration_minutes, s.base_price,
		       COALESCE(s.doctor_commission_type, 'fixed'), COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'), COALESCE(s.therapist_commission_value, 0),
		       s.doctor_offering_commission_type, s.doctor_offering_commission_value,
		       s.therapist_offering_commission_type, s.therapist_offering_commission_value,
		       s.offering_price,
		       COALESCE(s.requires_doctor, false), COALESCE(s.is_active, true), s.created_at, s.updated_at,
		       c.id, c.name, c.description, COALESCE(c.is_active, true), c.created_at, c.updated_at
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		WHERE LOWER(s.name) IN (%s) AND COALESCE(s.is_active, true) = true
		  AND (s.organization_id = $%d OR ($%d::text = '' AND s.organization_id IS NULL))
		  AND s.deleted_at IS NULL
	`, placeholders, orgParamIdx, orgParamIdx)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query services by names: %w", err)
	}
	defer rows.Close()

	result := make(map[string]*models.Service, len(names))
	for rows.Next() {
		svc, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		result[strings.ToLower(svc.Name)] = &svc
	}
	return result, rows.Err()
}

func (r *Repository) Create(service *models.Service, orgID string) error {
	var createdByVal interface{}
	if service.CreatedBy != nil && *service.CreatedBy != "" {
		createdByVal = *service.CreatedBy
	}
	query := `
		INSERT INTO services (
			id, name, category_id, description, duration_minutes, base_price,
			doctor_commission_type, doctor_commission_value,
			therapist_commission_type, therapist_commission_value,
			doctor_offering_commission_type, doctor_offering_commission_value,
			therapist_offering_commission_type, therapist_offering_commission_value,
			offering_price,
			requires_doctor, is_active, created_at, updated_at,
			organization_id, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`
	if _, err := r.db.Exec(query, service.ID, service.Name, service.CategoryID, service.Description,
		service.DurationMinutes, service.BasePrice,
		service.DoctorCommissionType, service.DoctorCommissionValue,
		service.TherapistCommissionType, service.TherapistCommissionValue,
		service.DoctorOfferingCommissionType, service.DoctorOfferingCommissionValue,
		service.TherapistOfferingCommissionType, service.TherapistOfferingCommissionValue,
		service.OfferingPrice,
		service.RequiresDoctor, service.IsActive,
		service.CreatedAt, service.UpdatedAt, nullableString(orgID), createdByVal); err != nil {
		return fmt.Errorf("failed to create service: %w", err)
	}
	return nil
}

// Upsert inserts a new service or updates an existing one based on the unique
// index (organization_id, LOWER(name)). Uses ON CONFLICT DO UPDATE — 1 round-trip.
// Returns true if inserted, false if updated.
func (r *Repository) Upsert(service *models.Service, orgID, userID string) (bool, error) {
	var createdByVal interface{}
	if service.CreatedBy != nil && *service.CreatedBy != "" {
		createdByVal = *service.CreatedBy
	} else if userID != "" {
		createdByVal = userID
	}

	query := `
		INSERT INTO services (
			id, name, category_id, description, duration_minutes, base_price,
			doctor_commission_type, doctor_commission_value,
			therapist_commission_type, therapist_commission_value,
			doctor_offering_commission_type, doctor_offering_commission_value,
			therapist_offering_commission_type, therapist_offering_commission_value,
			offering_price,
			requires_doctor, is_active, created_at, updated_at,
			organization_id, created_by, updated_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
		ON CONFLICT (organization_id, LOWER(name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true
		DO UPDATE SET
			category_id    = COALESCE(EXCLUDED.category_id, services.category_id),
			description    = COALESCE(EXCLUDED.description, services.description),
			duration_minutes = COALESCE(EXCLUDED.duration_minutes, services.duration_minutes),
			base_price     = EXCLUDED.base_price,
			doctor_commission_type  = EXCLUDED.doctor_commission_type,
			doctor_commission_value = EXCLUDED.doctor_commission_value,
			therapist_commission_type  = EXCLUDED.therapist_commission_type,
			therapist_commission_value = EXCLUDED.therapist_commission_value,
			doctor_offering_commission_type   = COALESCE(EXCLUDED.doctor_offering_commission_type, services.doctor_offering_commission_type),
			doctor_offering_commission_value  = COALESCE(EXCLUDED.doctor_offering_commission_value, services.doctor_offering_commission_value),
			therapist_offering_commission_type = COALESCE(EXCLUDED.therapist_offering_commission_type, services.therapist_offering_commission_type),
			therapist_offering_commission_value = COALESCE(EXCLUDED.therapist_offering_commission_value, services.therapist_offering_commission_value),
			offering_price = COALESCE(EXCLUDED.offering_price, services.offering_price),
			requires_doctor = EXCLUDED.requires_doctor,
			updated_by     = EXCLUDED.updated_by,
			updated_at     = NOW()
		RETURNING (xmax = 0) AS inserted
	`
	var inserted bool
	err := r.db.QueryRow(query,
		service.ID, service.Name, service.CategoryID, service.Description,
		service.DurationMinutes, service.BasePrice,
		service.DoctorCommissionType, service.DoctorCommissionValue,
		service.TherapistCommissionType, service.TherapistCommissionValue,
		service.DoctorOfferingCommissionType, service.DoctorOfferingCommissionValue,
		service.TherapistOfferingCommissionType, service.TherapistOfferingCommissionValue,
		service.OfferingPrice,
		service.RequiresDoctor, service.IsActive,
		service.CreatedAt, service.UpdatedAt, nullableString(orgID), createdByVal, nullableString(userID),
	).Scan(&inserted)
	if err != nil {
		return false, fmt.Errorf("failed to upsert service: %w", err)
	}
	return inserted, nil
}

func (r *Repository) Update(id string, service *models.Service, orgID string) error {
	var updatedByVal interface{}
	if service.UpdatedBy != nil && *service.UpdatedBy != "" {
		updatedByVal = *service.UpdatedBy
	}
	result, err := r.db.Exec(`
		UPDATE services
		SET name = $1, category_id = $2, description = $3, duration_minutes = $4,
		    base_price = $5, doctor_commission_type = $6, doctor_commission_value = $7,
		    therapist_commission_type = $8, therapist_commission_value = $9,
		    doctor_offering_commission_type = $10, doctor_offering_commission_value = $11,
		    therapist_offering_commission_type = $12, therapist_offering_commission_value = $13,
		    offering_price = $14,
		    requires_doctor = $15, updated_by = $16, updated_at = NOW()
		WHERE id = $17 AND COALESCE(is_active, true) = true
		  AND (organization_id = $18 OR ($18::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		service.Name, service.CategoryID, service.Description,
		service.DurationMinutes, service.BasePrice,
		service.DoctorCommissionType, service.DoctorCommissionValue,
		service.TherapistCommissionType, service.TherapistCommissionValue,
		service.DoctorOfferingCommissionType, service.DoctorOfferingCommissionValue,
		service.TherapistOfferingCommissionType, service.TherapistOfferingCommissionValue,
		service.OfferingPrice,
		service.RequiresDoctor, updatedByVal, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to update service: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id, orgID, userByID string) error {
	var userVal interface{}
	if userByID != "" {
		userVal = userByID
	}
	result, err := r.db.Exec(`
		UPDATE services
		SET deleted_at = NOW(), is_active = false, updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, orgID, userVal)
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
		  AND deleted_at IS NULL
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
	var createdByVal interface{}
	if category.CreatedBy != nil && *category.CreatedBy != "" {
		createdByVal = *category.CreatedBy
	}
	_, err := r.db.Exec(`
		INSERT INTO service_categories (id, name, description, is_active, created_at, updated_at, organization_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, category.ID, category.Name, category.Description, category.IsActive, category.CreatedAt, category.UpdatedAt, nullableString(orgID), createdByVal)
	if err != nil {
		return fmt.Errorf("failed to create service category: %w", err)
	}
	return nil
}

func (r *Repository) UpdateCategory(id string, category *models.ServiceCategory, orgID string) error {
	var updatedByVal interface{}
	if category.UpdatedBy != nil && *category.UpdatedBy != "" {
		updatedByVal = *category.UpdatedBy
	}
	result, err := r.db.Exec(`
		UPDATE service_categories
		SET name = $1, description = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND COALESCE(is_active, true) = true
		  AND (organization_id = $5 OR ($5::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		category.Name, category.Description, updatedByVal, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to update service category: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) DeleteCategory(id, orgID, userByID string) error {
	var userVal interface{}
	if userByID != "" {
		userVal = userByID
	}
	result, err := r.db.Exec(`
		UPDATE service_categories
		SET deleted_at = NOW(), is_active = false, updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, orgID, userVal)
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
	// Nullable offering commission fields + offering_price
	var docOffType, therapistOffType sql.NullString
	var docOffValue, therapistOffValue sql.NullFloat64
	var offeringPrice sql.NullFloat64
	err := scanner.Scan(
		&service.ID, &service.Name, &service.CategoryID, &service.Description,
		&service.DurationMinutes, &service.BasePrice,
		&service.DoctorCommissionType, &service.DoctorCommissionValue,
		&service.TherapistCommissionType, &service.TherapistCommissionValue,
		&docOffType, &docOffValue, &therapistOffType, &therapistOffValue,
		&offeringPrice,
		&service.RequiresDoctor, &service.IsActive,
		&service.CreatedAt, &service.UpdatedAt,
		&categoryID, &categoryName,
		&categoryDescription, &categoryIsActive, &categoryCreatedAt, &categoryUpdatedAt,
	)
	if err != nil {
		return models.Service{}, err
	}
	if docOffType.Valid {
		service.DoctorOfferingCommissionType = &docOffType.String
	}
	if docOffValue.Valid {
		service.DoctorOfferingCommissionValue = &docOffValue.Float64
	}
	if therapistOffType.Valid {
		service.TherapistOfferingCommissionType = &therapistOffType.String
	}
	if therapistOffValue.Valid {
		service.TherapistOfferingCommissionValue = &therapistOffValue.Float64
	}
	if offeringPrice.Valid {
		service.OfferingPrice = &offeringPrice.Float64
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
