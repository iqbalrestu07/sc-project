package product

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

func (r *Repository) List(orgID string) ([]models.Product, error) {
	rows, err := r.db.Query(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
		       created_at, updated_at
		FROM products
		WHERE COALESCE(is_active, true) = true
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
		ORDER BY name ASC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read products: %w", err)
	}
	if products == nil {
		products = []models.Product{}
	}
	return products, nil
}

func (r *Repository) Get(id, orgID string) (*models.Product, error) {
	row := r.db.QueryRow(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
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
			created_at, updated_at, organization_id, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`, product.ID, product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate, product.IsActive,
		product.IsConsumable, product.ConsumableCategory,
		product.CreatedAt, product.UpdatedAt, nullableString(orgID), createdByVal)
	if err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}
	return nil
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
		    updated_by = $13, updated_at = NOW()
		WHERE id = $14 AND COALESCE(is_active, true) = true
		  AND (organization_id = $15 OR ($15::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate,
		product.IsConsumable, product.ConsumableCategory,
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
