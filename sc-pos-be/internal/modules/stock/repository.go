package stock

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

// StockMovementWithRelations embeds the base model and adds denormalised fields.
type StockMovementWithRelations struct {
	models.StockMovement
	ProductName     string  `json:"product_name"`
	ProductUnit     string  `json:"product_unit"`
	TransactionCode *string `json:"transaction_code,omitempty"`
}

// ListParams holds all optional filter parameters for List.
type ListParams struct {
	ProductID     string
	ReferenceType string // "manual" | "transaction" | "" (all)
	From          *time.Time
	To            *time.Time
	OrgID         string
}

func (r *Repository) List(params ListParams) ([]StockMovementWithRelations, error) {
	args := []interface{}{}
	idx := 1

	// Build WHERE clauses incrementally
	where := fmt.Sprintf(
		`(sm.organization_id = $%d OR ($%d::text = '' AND sm.organization_id IS NULL))`,
		idx, idx,
	)
	args = append(args, params.OrgID)
	idx++

	if params.ProductID != "" {
		where += fmt.Sprintf(` AND sm.product_id = $%d`, idx)
		args = append(args, params.ProductID)
		idx++
	}

	// "manual" means no reference_type (created from the opname UI)
	// "transaction" means reference_type = 'transaction'
	switch params.ReferenceType {
	case "manual":
		where += ` AND (sm.reference_type IS NULL OR sm.reference_type = '')`
	case "transaction":
		where += fmt.Sprintf(` AND sm.reference_type = $%d`, idx)
		args = append(args, "transaction")
		idx++
	}

	if params.From != nil {
		where += fmt.Sprintf(` AND sm.created_at >= $%d`, idx)
		args = append(args, params.From)
		idx++
	}
	if params.To != nil {
		where += fmt.Sprintf(` AND sm.created_at <= $%d`, idx)
		args = append(args, params.To)
		idx++
	}

	query := `
		SELECT sm.id, sm.product_id, sm.movement_type, sm.quantity, sm.reason,
		       sm.reference_id, sm.reference_type, sm.notes, sm.created_by, sm.created_at,
		       COALESCE(p.name, ''),
		       COALESCE(p.unit, 'pcs'),
		       t.transaction_code
		FROM stock_movements sm
		LEFT JOIN products p  ON p.id = sm.product_id
		LEFT JOIN transactions t ON t.id = sm.reference_id AND sm.reference_type = 'transaction'
		WHERE ` + where + `
		ORDER BY sm.created_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query stock movements: %w", err)
	}
	defer rows.Close()

	var movements []StockMovementWithRelations
	for rows.Next() {
		var m StockMovementWithRelations
		var txCode sql.NullString
		if err := rows.Scan(
			&m.ID, &m.ProductID, &m.MovementType, &m.Quantity,
			&m.Reason, &m.ReferenceID, &m.ReferenceType, &m.Notes,
			&m.CreatedBy, &m.CreatedAt,
			&m.ProductName, &m.ProductUnit, &txCode,
		); err != nil {
			return nil, fmt.Errorf("failed to scan stock movement: %w", err)
		}
		if txCode.Valid {
			m.TransactionCode = &txCode.String
		}
		movements = append(movements, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read stock movements: %w", err)
	}
	if movements == nil {
		movements = []StockMovementWithRelations{}
	}
	return movements, nil
}

func (r *Repository) Create(m *models.StockMovement, orgID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	m.ID = uuid.New().String()
	m.CreatedAt = time.Now()

	if _, err := tx.Exec(`
		INSERT INTO stock_movements (id, product_id, movement_type, quantity, reason,
		                            reference_id, reference_type, notes, created_by, created_at,
		                            organization_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, m.ID, m.ProductID, m.MovementType, m.Quantity, m.Reason,
		m.ReferenceID, m.ReferenceType, m.Notes, m.CreatedBy, m.CreatedAt, orgID); err != nil {
		return fmt.Errorf("failed to insert stock movement: %w", err)
	}

	// Adjust product stock.
	// "in"         → delta = +quantity (always positive)
	// "out"        → delta = -|quantity| (force negative regardless of sign)
	// "adjustment" → delta = quantity as-is (signed; negative = reduce stock)
	var delta int
	switch m.MovementType {
	case "in":
		delta = m.Quantity
		if delta < 0 {
			delta = -delta
		}
	case "out":
		// quantity stored as negative in adjustment context; ensure we subtract
		if m.Quantity > 0 {
			delta = -m.Quantity
		} else {
			delta = m.Quantity
		}
	case "adjustment":
		delta = m.Quantity
	}

	if _, err := tx.Exec(`
		UPDATE products
		SET current_stock = GREATEST(0, COALESCE(current_stock, 0) + $1),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, delta, m.ProductID); err != nil {
		return fmt.Errorf("failed to update product stock: %w", err)
	}

	return tx.Commit()
}
