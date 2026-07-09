package service_package

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// ─── Groups ──────────────────────────────────────────────────────────────────

// ListGroups returns all consumable groups for a given service, each with their items populated.
func (r *Repository) ListGroups(serviceID, orgID string) ([]models.ServiceConsumableGroup, error) {
	rows, err := r.db.Query(`
		SELECT id, service_id, name, quantity_used, created_at, updated_at
		FROM service_consumable_groups
		WHERE service_id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
		ORDER BY created_at ASC
	`, serviceID, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list consumable groups: %w", err)
	}
	defer rows.Close()

	var groups []models.ServiceConsumableGroup
	for rows.Next() {
		var g models.ServiceConsumableGroup
		if err := rows.Scan(&g.ID, &g.ServiceID, &g.Name, &g.QuantityUsed, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan group: %w", err)
		}
		groups = append(groups, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate groups: %w", err)
	}
	if groups == nil {
		return []models.ServiceConsumableGroup{}, nil
	}

	// Populate items for each group
	for i := range groups {
		items, err := r.listGroupItems(groups[i].ID, orgID)
		if err != nil {
			return nil, err
		}
		groups[i].Items = items
	}
	return groups, nil
}

func (r *Repository) CreateGroup(g *models.ServiceConsumableGroup, orgID, userByID string) error {
	g.ID = uuid.New().String()
	g.CreatedAt = time.Now()
	g.UpdatedAt = time.Now()
	_, err := r.db.Exec(`
		INSERT INTO service_consumable_groups
			(id, service_id, name, quantity_used, organization_id, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, g.ID, g.ServiceID, g.Name, g.QuantityUsed,
		nullableString(orgID), nullableString(userByID), g.CreatedAt, g.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create consumable group: %w", err)
	}
	return nil
}

func (r *Repository) UpdateGroup(id string, name string, qty float64, orgID, userByID string) error {
	result, err := r.db.Exec(`
		UPDATE service_consumable_groups
		SET name = $1, quantity_used = $2, updated_by = $3, updated_at = NOW()
		WHERE id = $4
		  AND (organization_id = $5 OR ($5::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, name, qty, nullableString(userByID), id, orgID)
	if err != nil {
		return fmt.Errorf("failed to update consumable group: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *Repository) DeleteGroup(id, orgID, userByID string) error {
	result, err := r.db.Exec(`
		UPDATE service_consumable_groups
		SET deleted_at = NOW(), updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, id, orgID, nullableString(userByID))
	if err != nil {
		return fmt.Errorf("failed to delete consumable group: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ─── Group Items ──────────────────────────────────────────────────────────────

func (r *Repository) listGroupItems(groupID, orgID string) ([]models.ServiceConsumableGroupItem, error) {
	rows, err := r.db.Query(`
		SELECT gi.id, gi.group_id, gi.product_id, gi.priority, gi.created_at,
		       p.name, p.unit, p.current_stock, p.selling_price
		FROM service_consumable_group_items gi
		JOIN products p ON p.id = gi.product_id
		WHERE gi.group_id = $1
		  AND (gi.organization_id = $2 OR ($2::text = '' AND gi.organization_id IS NULL))
		  AND gi.deleted_at IS NULL
		ORDER BY gi.priority ASC, gi.created_at ASC
	`, groupID, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list group items: %w", err)
	}
	defer rows.Close()

	var items []models.ServiceConsumableGroupItem
	for rows.Next() {
		var it models.ServiceConsumableGroupItem
		if err := rows.Scan(&it.ID, &it.GroupID, &it.ProductID, &it.Priority, &it.CreatedAt,
			&it.ProductName, &it.ProductUnit, &it.CurrentStock, &it.SellingPrice); err != nil {
			return nil, fmt.Errorf("failed to scan group item: %w", err)
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate group items: %w", err)
	}
	if items == nil {
		return []models.ServiceConsumableGroupItem{}, nil
	}
	return items, nil
}

func (r *Repository) AddGroupItem(it *models.ServiceConsumableGroupItem, orgID, userByID string) error {
	it.ID = uuid.New().String()
	it.CreatedAt = time.Now()
	_, err := r.db.Exec(`
		INSERT INTO service_consumable_group_items
			(id, group_id, product_id, priority, organization_id, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (group_id, product_id) DO UPDATE
			SET priority = EXCLUDED.priority, deleted_at = NULL
	`, it.ID, it.GroupID, it.ProductID, it.Priority,
		nullableString(orgID), nullableString(userByID), it.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to add group item: %w", err)
	}
	return nil
}

func (r *Repository) DeleteGroupItem(id, orgID, userByID string) error {
	result, err := r.db.Exec(`
		UPDATE service_consumable_group_items
		SET deleted_at = NOW()
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, id, orgID)
	if err != nil {
		return fmt.Errorf("failed to delete group item: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ─── Stock validation (called before marking paid) ───────────────────────────

// ConsumableStockCheck holds the result of checking whether the selected consumable
// product has enough stock for a given transaction item.
type ConsumableStockCheck struct {
	ItemID      string
	ProductID   string
	ProductName string
	Required    float64
	Available   int
}

// ValidateConsumableStock checks that every service transaction item that has
// selected_consumable_product_id set has enough stock.
// Returns a list of shortfalls (empty = all good).
func (r *Repository) ValidateConsumableStock(transactionID string) ([]ConsumableStockCheck, error) {
	rows, err := r.db.Query(`
		SELECT
			ti.id,
			ti.selected_consumable_product_id,
			p.name,
			p.current_stock,
			COALESCE(scg.quantity_used, 1) * ti.quantity AS required_qty
		FROM transaction_items ti
		JOIN products p ON p.id = ti.selected_consumable_product_id
		LEFT JOIN service_consumable_groups scg
			ON scg.service_id = ti.service_id
			AND scg.deleted_at IS NULL
		WHERE ti.transaction_id = $1
		  AND ti.item_type = 'service'
		  AND ti.selected_consumable_product_id IS NOT NULL
		  AND ti.deleted_at IS NULL
	`, transactionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query consumable stock: %w", err)
	}
	defer rows.Close()

	var shortfalls []ConsumableStockCheck
	for rows.Next() {
		var c ConsumableStockCheck
		var required float64
		if err := rows.Scan(&c.ItemID, &c.ProductID, &c.ProductName, &c.Available, &required); err != nil {
			return nil, fmt.Errorf("failed to scan stock check: %w", err)
		}
		c.Required = required
		if float64(c.Available) < required {
			shortfalls = append(shortfalls, c)
		}
	}
	return shortfalls, rows.Err()
}
