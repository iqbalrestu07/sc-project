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
	ProductName *string `json:"product_name,omitempty"`
	Unit        *string `json:"unit,omitempty"`
	Stock       *int    `json:"current_stock,omitempty"`
}

func (r *Repository) ListByService(serviceID, orgID string) ([]ConsumableWithProduct, error) {
	baseQuery := `
		SELECT sc.id, sc.service_id, sc.product_id, sc.quantity_used, sc.created_at,
		       p.name, p.unit, p.current_stock
		FROM service_consumables sc
		JOIN products p ON p.id = sc.product_id`
	args := []interface{}{}
	argIdx := 1
	var where string
	if serviceID != "" {
		where = fmt.Sprintf(" WHERE sc.service_id = $%d", argIdx)
		args = append(args, serviceID)
		argIdx++
		where += fmt.Sprintf(" AND (sc.organization_id = $%d OR ($%d::text = '' AND sc.organization_id IS NULL))", argIdx, argIdx)
		args = append(args, orgID)
	} else {
		where = fmt.Sprintf(" WHERE (sc.organization_id = $%d OR ($%d::text = '' AND sc.organization_id IS NULL))", argIdx, argIdx)
		args = append(args, orgID)
	}
	where += " AND sc.deleted_at IS NULL"
	query := baseQuery + where + " ORDER BY sc.created_at ASC"

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

func (r *Repository) Upsert(c *models.ServiceConsumable, orgID, userByID string) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	c.CreatedAt = time.Now()
	_, err := r.db.Exec(`
		INSERT INTO service_consumables (id, service_id, product_id, quantity_used, created_at, organization_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (service_id, product_id)
		DO UPDATE SET quantity_used = EXCLUDED.quantity_used, updated_by = $7
	`, c.ID, c.ServiceID, c.ProductID, c.QuantityUsed, c.CreatedAt, orgID, nullableString(userByID))
	if err != nil {
		return fmt.Errorf("failed to upsert consumable: %w", err)
	}
	return nil
}

func (r *Repository) Delete(id, orgID, userByID string) error {
	result, err := r.db.Exec(`
		UPDATE service_consumables
		SET deleted_at = NOW(), updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, orgID, nullableString(userByID))
	if err != nil {
		return fmt.Errorf("failed to delete consumable: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
