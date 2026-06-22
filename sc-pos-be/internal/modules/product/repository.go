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

func (r *Repository) List() ([]models.Product, error) {
	rows, err := r.db.Query(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true), created_at, updated_at
		FROM products
		WHERE COALESCE(is_active, true) = true
		ORDER BY name ASC
	`)
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

func (r *Repository) Get(id string) (*models.Product, error) {
	row := r.db.QueryRow(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 5), unit,
		       expiry_date, COALESCE(is_active, true), created_at, updated_at
		FROM products
		WHERE id = $1 AND COALESCE(is_active, true) = true
	`, id)
	product, err := scanProduct(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *Repository) Create(product *models.Product) error {
	_, err := r.db.Exec(`
		INSERT INTO products (
			id, name, category, sku, supplier, purchase_price, selling_price,
			current_stock, minimum_stock, unit, expiry_date, is_active, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`, product.ID, product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate, product.IsActive,
		product.CreatedAt, product.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}
	return nil
}

func (r *Repository) Update(id string, product *models.Product) error {
	result, err := r.db.Exec(`
		UPDATE products
		SET name = $1, category = $2, sku = $3, supplier = $4,
		    purchase_price = $5, selling_price = $6, current_stock = $7,
		    minimum_stock = $8, unit = $9, expiry_date = $10,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $11 AND COALESCE(is_active, true) = true
	`, product.Name, product.Category, product.Sku, product.Supplier,
		product.PurchasePrice, product.SellingPrice, product.CurrentStock,
		product.MinimumStock, product.Unit, product.ExpiryDate, id)
	if err != nil {
		return fmt.Errorf("failed to update product: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id string) error {
	result, err := r.db.Exec(`UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND COALESCE(is_active, true) = true`, id)
	if err != nil {
		return fmt.Errorf("failed to delete product: %w", err)
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
		&product.ExpiryDate, &product.IsActive, &product.CreatedAt, &product.UpdatedAt,
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
