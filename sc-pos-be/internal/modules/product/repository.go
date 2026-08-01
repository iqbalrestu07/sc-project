package product

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

func (r *Repository) List(orgID, search string, page, limit int) ([]models.Product, bool, error) {
	offset := (page - 1) * limit
	fetchLimit := limit + 1

	query := `
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
		       doctor_commission_type, doctor_commission_value,
		       therapist_commission_type, therapist_commission_value,
		       doctor_offering_commission_type, doctor_offering_commission_value,
		       therapist_offering_commission_type, therapist_offering_commission_value,
		       created_at, updated_at
		FROM products
		WHERE COALESCE(is_active, true) = true
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`

	args := []interface{}{orgID}

	if search != "" {
		query += ` AND (name ILIKE $2 OR sku ILIKE $2)`
		args = append(args, "%"+search+"%")
	}

	argIdx := len(args) + 1
	query += fmt.Sprintf(` ORDER BY name ASC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, fetchLimit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, false, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return nil, false, err
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, false, fmt.Errorf("failed to read products: %w", err)
	}
	if products == nil {
		products = []models.Product{}
	}

	hasNext := len(products) > limit
	if hasNext {
		products = products[:limit]
	}

	return products, hasNext, nil
}

func (r *Repository) Get(id, orgID string) (*models.Product, error) {
	row := r.db.QueryRow(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
		       doctor_commission_type, doctor_commission_value,
		       therapist_commission_type, therapist_commission_value,
		       doctor_offering_commission_type, doctor_offering_commission_value,
		       therapist_offering_commission_type, therapist_offering_commission_value,
		       created_at, updated_at
		FROM products
		WHERE id = $1 AND COALESCE(is_active, true) = true
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, id, orgID)
	product, err := scanProduct(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *Repository) GetByName(name, orgID string) (*models.Product, error) {
	row := r.db.QueryRow(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
		       doctor_commission_type, doctor_commission_value,
		       therapist_commission_type, therapist_commission_value,
		       doctor_offering_commission_type, doctor_offering_commission_value,
		       therapist_offering_commission_type, therapist_offering_commission_value,
		       created_at, updated_at
		FROM products
		WHERE LOWER(name) = LOWER($1) AND COALESCE(is_active, true) = true
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
		LIMIT 1
	`, name, orgID)
	product, err := scanProduct(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &product, nil
}

// GetByNames fetches multiple products by name in a single query.
// Returns a map of lower(name) → *models.Product for fast lookup.
// This avoids N separate GetByName round-trips during bulk import.
func (r *Repository) GetByNames(names []string, orgID string) (map[string]*models.Product, error) {
	if len(names) == 0 {
		return map[string]*models.Product{}, nil
	}
	// Build placeholders: $1, $2, $3, ...
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
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
		       doctor_commission_type, doctor_commission_value,
		       therapist_commission_type, therapist_commission_value,
		       doctor_offering_commission_type, doctor_offering_commission_value,
		       therapist_offering_commission_type, therapist_offering_commission_value,
		       created_at, updated_at
		FROM products
		WHERE LOWER(name) IN (%s) AND COALESCE(is_active, true) = true
		  AND (organization_id = $%d OR ($%d::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, placeholders, orgParamIdx, orgParamIdx)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query products by names: %w", err)
	}
	defer rows.Close()

	result := make(map[string]*models.Product, len(names))
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		result[strings.ToLower(product.Name)] = &product
	}
	return result, rows.Err()
}

func (r *Repository) Create(product *models.Product, orgID string) error {
	var createdByVal interface{}
	if product.CreatedBy != nil && *product.CreatedBy != "" {
		createdByVal = *product.CreatedBy
	}
	_, err := r.db.Exec(`
		INSERT INTO products (
			id, name, category, sku, supplier, purchase_price, selling_price,
			current_stock, minimum_stock, unit, expiry_date, is_active,
			is_consumable, consumable_category,
			doctor_commission_type, doctor_commission_value,
			therapist_commission_type, therapist_commission_value,
			doctor_offering_commission_type, doctor_offering_commission_value,
			therapist_offering_commission_type, therapist_offering_commission_value,
			created_at, updated_at, organization_id, created_by
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
	`, product.ID, product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate, product.IsActive,
		product.IsConsumable, product.ConsumableCategory,
		product.DoctorCommissionType, product.DoctorCommissionValue,
		product.TherapistCommissionType, product.TherapistCommissionValue,
		product.DoctorOfferingCommissionType, product.DoctorOfferingCommissionValue,
		product.TherapistOfferingCommissionType, product.TherapistOfferingCommissionValue,
		product.CreatedAt, product.UpdatedAt, nullableString(orgID), createdByVal)
	if err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}
	return nil
}

// upserter is the minimal interface needed to run the upsert query.
// Both *sql.DB and *sql.Tx satisfy this.
type upserter interface {
	QueryRow(query string, args ...interface{}) *sql.Row
}

func upsertProduct(exec upserter, product *models.Product, orgID, userID string) (bool, error) {
	var createdByVal interface{}
	if product.CreatedBy != nil && *product.CreatedBy != "" {
		createdByVal = *product.CreatedBy
	} else if userID != "" {
		createdByVal = userID
	}

	query := `
		INSERT INTO products (
			id, name, category, sku, supplier, purchase_price, selling_price,
			current_stock, minimum_stock, unit, expiry_date, is_active,
			is_consumable, consumable_category,
			doctor_commission_type, doctor_commission_value,
			therapist_commission_type, therapist_commission_value,
			doctor_offering_commission_type, doctor_offering_commission_value,
			therapist_offering_commission_type, therapist_offering_commission_value,
			created_at, updated_at, organization_id, created_by, updated_by
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
		ON CONFLICT (organization_id, LOWER(name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true
		DO UPDATE SET
			category          = COALESCE(EXCLUDED.category, products.category),
			sku               = COALESCE(EXCLUDED.sku, products.sku),
			supplier          = COALESCE(EXCLUDED.supplier, products.supplier),
			purchase_price    = COALESCE(EXCLUDED.purchase_price, products.purchase_price),
			selling_price     = COALESCE(EXCLUDED.selling_price, products.selling_price),
			is_consumable     = EXCLUDED.is_consumable,
			consumable_category = COALESCE(EXCLUDED.consumable_category, products.consumable_category),
			doctor_commission_type   = COALESCE(EXCLUDED.doctor_commission_type, products.doctor_commission_type),
			doctor_commission_value  = COALESCE(EXCLUDED.doctor_commission_value, products.doctor_commission_value),
			therapist_commission_type = COALESCE(EXCLUDED.therapist_commission_type, products.therapist_commission_type),
			therapist_commission_value = COALESCE(EXCLUDED.therapist_commission_value, products.therapist_commission_value),
			updated_by       = EXCLUDED.updated_by,
			updated_at       = NOW()
		RETURNING (xmax = 0) AS inserted
	`
	var inserted bool
	err := exec.QueryRow(query,
		product.ID, product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate, product.IsActive,
		product.IsConsumable, product.ConsumableCategory,
		product.DoctorCommissionType, product.DoctorCommissionValue,
		product.TherapistCommissionType, product.TherapistCommissionValue,
		product.DoctorOfferingCommissionType, product.DoctorOfferingCommissionValue,
		product.TherapistOfferingCommissionType, product.TherapistOfferingCommissionValue,
		product.CreatedAt, product.UpdatedAt, nullableString(orgID), createdByVal, nullableString(userID),
	).Scan(&inserted)
	if err != nil {
		return false, fmt.Errorf("failed to upsert product: %w", err)
	}
	return inserted, nil
}

// Upsert inserts a new product or updates an existing one based on the unique
// index (organization_id, LOWER(name)). Uses ON CONFLICT DO UPDATE — 1 round-trip.
// Returns true if inserted, false if updated.
func (r *Repository) Upsert(product *models.Product, orgID, userID string) (bool, error) {
	return upsertProduct(r.db, product, orgID, userID)
}

// UpsertTx is like Upsert but runs within an existing transaction.
func (r *Repository) UpsertTx(tx *sql.Tx, product *models.Product, orgID, userID string) (bool, error) {
	return upsertProduct(tx, product, orgID, userID)
}

func (r *Repository) Update(id string, product *models.Product, orgID string) error {
	var updatedByVal interface{}
	if product.UpdatedBy != nil && *product.UpdatedBy != "" {
		updatedByVal = *product.UpdatedBy
	}
	result, err := r.db.Exec(`
		UPDATE products
		SET name = $1, category = $2, sku = $3, supplier = $4,
		    purchase_price = $5, selling_price = $6, current_stock = $7,
		    minimum_stock = $8, unit = $9, expiry_date = $10,
		    is_consumable = $11, consumable_category = $12,
		    doctor_commission_type = $13, doctor_commission_value = $14,
		    therapist_commission_type = $15, therapist_commission_value = $16,
		    doctor_offering_commission_type = $17, doctor_offering_commission_value = $18,
		    therapist_offering_commission_type = $19, therapist_offering_commission_value = $20,
		    updated_by = $21, updated_at = NOW()
		WHERE id = $22 AND COALESCE(is_active, true) = true
		  AND (organization_id = $23 OR ($23::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate,
		product.IsConsumable, product.ConsumableCategory,
		product.DoctorCommissionType, product.DoctorCommissionValue,
		product.TherapistCommissionType, product.TherapistCommissionValue,
		product.DoctorOfferingCommissionType, product.DoctorOfferingCommissionValue,
		product.TherapistOfferingCommissionType, product.TherapistOfferingCommissionValue,
		updatedByVal, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to update product: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id, orgID, userByID string) error {
	var userVal interface{}
	if userByID != "" {
		userVal = userByID
	}
	result, err := r.db.Exec(`
		UPDATE products
		SET deleted_at = NOW(), is_active = false, updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, orgID, userVal)
	if err != nil {
		return fmt.Errorf("failed to delete product: %w", err)
	}
	return checkRows(result)
}

// ──── Product Categories ────

func (r *Repository) ListCategories(orgID string) ([]models.ProductCategory, error) {
	rows, err := r.db.Query(`
		SELECT id, name, description, COALESCE(is_active, true), created_at, updated_at
		FROM product_categories
		WHERE COALESCE(is_active, true) = true
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
		ORDER BY name ASC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query product categories: %w", err)
	}
	defer rows.Close()

	var categories []models.ProductCategory
	for rows.Next() {
		var c models.ProductCategory
		var desc sql.NullString
		if err := rows.Scan(&c.ID, &c.Name, &desc, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan product category: %w", err)
		}
		if desc.Valid {
			c.Description = &desc.String
		}
		categories = append(categories, c)
	}
	if categories == nil {
		categories = []models.ProductCategory{}
	}
	return categories, nil
}

func (r *Repository) CreateCategory(c *models.ProductCategory, orgID string) error {
	var createdByVal interface{}
	if c.CreatedBy != nil && *c.CreatedBy != "" {
		createdByVal = *c.CreatedBy
	}
	_, err := r.db.Exec(`
		INSERT INTO product_categories (id, name, description, is_active, created_at, updated_at, organization_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, c.ID, c.Name, c.Description, c.IsActive, c.CreatedAt, c.UpdatedAt, nullableString(orgID), createdByVal)
	if err != nil {
		return fmt.Errorf("failed to create product category: %w", err)
	}
	return nil
}

func (r *Repository) UpdateCategory(id string, c *models.ProductCategory, orgID string) error {
	var updatedByVal interface{}
	if c.UpdatedBy != nil && *c.UpdatedBy != "" {
		updatedByVal = *c.UpdatedBy
	}
	result, err := r.db.Exec(`
		UPDATE product_categories
		SET name = $1, description = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND COALESCE(is_active, true) = true
		  AND (organization_id = $5 OR ($5::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		c.Name, c.Description, updatedByVal, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to update product category: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) DeleteCategory(id, orgID, userByID string) error {
	var userVal interface{}
	if userByID != "" {
		userVal = userByID
	}
	result, err := r.db.Exec(`
		UPDATE product_categories
		SET deleted_at = NOW(), is_active = false, updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, orgID, userVal)
	if err != nil {
		return fmt.Errorf("failed to delete product category: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) DecreaseStock(tx *sql.Tx, id string, quantity int) error {
	result, err := tx.Exec(`
		UPDATE products
		SET current_stock = GREATEST(COALESCE(current_stock, 0) - $1, 0), updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND COALESCE(is_active, true) = true
	`, quantity, id)
	if err != nil {
		return fmt.Errorf("failed to decrease product stock: %w", err)
	}
	return checkRows(result)
}

type productScanner interface {
	Scan(dest ...interface{}) error
}

func scanProduct(scanner productScanner) (models.Product, error) {
	var product models.Product
	err := scanner.Scan(
		&product.ID, &product.Name, &product.Category, &product.Sku,
		&product.Supplier, &product.PurchasePrice, &product.SellingPrice,
		&product.CurrentStock, &product.MinimumStock, &product.Unit,
		&product.ExpiryDate, &product.IsActive,
		&product.IsConsumable, &product.ConsumableCategory,
		&product.DoctorCommissionType, &product.DoctorCommissionValue,
		&product.TherapistCommissionType, &product.TherapistCommissionValue,
		&product.DoctorOfferingCommissionType, &product.DoctorOfferingCommissionValue,
		&product.TherapistOfferingCommissionType, &product.TherapistOfferingCommissionValue,
		&product.CreatedAt, &product.UpdatedAt,
	)
	if err != nil {
		return models.Product{}, err
	}
	return product, nil
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
