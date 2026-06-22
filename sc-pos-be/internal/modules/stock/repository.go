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

func (r *Repository) List(productID string) ([]models.StockMovement, error) {
	query := `
		SELECT id, product_id, movement_type, quantity, reason,
		       reference_id, reference_type, notes, created_by, created_at
		FROM stock_movements`
	args := []interface{}{}
	if productID != "" {
		query += " WHERE product_id = $1"
		args = append(args, productID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query stock movements: %w", err)
	}
	defer rows.Close()

	var movements []models.StockMovement
	for rows.Next() {
		var m models.StockMovement
		if err := rows.Scan(&m.ID, &m.ProductID, &m.MovementType, &m.Quantity,
			&m.Reason, &m.ReferenceID, &m.ReferenceType, &m.Notes,
			&m.CreatedBy, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan stock movement: %w", err)
		}
		movements = append(movements, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read stock movements: %w", err)
	}
	if movements == nil {
		movements = []models.StockMovement{}
	}
	return movements, nil
}

func (r *Repository) Create(m *models.StockMovement) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	m.ID = uuid.New().String()
	m.CreatedAt = time.Now()

	if _, err := tx.Exec(`
		INSERT INTO stock_movements (id, product_id, movement_type, quantity, reason,
		                            reference_id, reference_type, notes, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, m.ID, m.ProductID, m.MovementType, m.Quantity, m.Reason,
		m.ReferenceID, m.ReferenceType, m.Notes, m.CreatedBy, m.CreatedAt); err != nil {
		return fmt.Errorf("failed to insert stock movement: %w", err)
	}

	// Adjust product stock
	var delta int
	switch m.MovementType {
	case "in":
		delta = m.Quantity
	case "out":
		delta = -m.Quantity
	case "adjustment":
		// For adjustment, quantity is the absolute new value delta
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
