package consumable

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

type ConsumableWithProduct struct {
	models.ServiceConsumable
	ProductName *string  `json:"product_name,omitempty"`
	Unit        *string  `json:"unit,omitempty"`
	Stock       *int     `json:"current_stock,omitempty"`
}

func (r *Repository) ListByService(serviceID string) ([]ConsumableWithProduct, error) {
	query := `
		SELECT sc.id, sc.service_id, sc.product_id, sc.quantity_used, sc.created_at,
		       p.name, p.unit, p.current_stock
		FROM service_consumables sc
		JOIN products p ON p.id = sc.product_id`
	args := []interface{}{}
	if serviceID != "" {
		query += " WHERE sc.service_id = $1"
		args = append(args, serviceID)
	}
	query += " ORDER BY sc.created_at ASC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query consumables: %w", err)
	}
	defer rows.Close()

	var result []ConsumableWithProduct
	for rows.Next() {
		var c ConsumableWithProduct
		if err := rows.Scan(&c.ID, &c.ServiceID, &c.ProductID, &c.QuantityUsed, &c.CreatedAt,
			&c.ProductName, &c.Unit, &c.Stock); err != nil {
			return nil, fmt.Errorf("failed to scan consumable: %w", err)
		}
		result = append(result, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read consumables: %w", err)
	}
	if result == nil {
		result = []ConsumableWithProduct{}
	}
	return result, nil
}

func (r *Repository) Upsert(c *models.ServiceConsumable) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	c.CreatedAt = time.Now()
	_, err := r.db.Exec(`
		INSERT INTO service_consumables (id, service_id, product_id, quantity_used, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (service_id, product_id)
		DO UPDATE SET quantity_used = EXCLUDED.quantity_used
	`, c.ID, c.ServiceID, c.ProductID, c.QuantityUsed, c.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to upsert consumable: %w", err)
	}
	return nil
}

func (r *Repository) Delete(id string) error {
	result, err := r.db.Exec(`DELETE FROM service_consumables WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete consumable: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
