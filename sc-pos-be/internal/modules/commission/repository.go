package commission

import (
	"database/sql"
	"fmt"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

type CommissionWithRelations struct {
	models.Commission
	Staff       *StaffSummary       `json:"staff,omitempty"`
	Transaction *TransactionSummary `json:"transaction,omitempty"`
}

type StaffSummary struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

type TransactionSummary struct {
	ID              string `json:"id"`
	TransactionCode string `json:"transaction_code"`
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) List(orgID, staffID string) ([]CommissionWithRelations, error) {
	query := `
		SELECT c.id, c.staff_id, c.staff_role, c.transaction_id, c.transaction_item_id,
		       c.base_amount, c.commission_type, c.commission_value, c.commission_amount,
		       c.status, c.created_at, c.updated_at,
		       s.id, s.full_name, s.role, t.id, t.transaction_code
		FROM commissions c
		LEFT JOIN staff s ON s.id = c.staff_id
		LEFT JOIN transactions t ON t.id = c.transaction_id
		WHERE ($2 = '' OR c.staff_id = $2)
		  AND (c.organization_id = $1 OR ($1::text = '' AND c.organization_id IS NULL))
		ORDER BY c.created_at DESC
	`
	rows, err := r.db.Query(query, orgID, staffID)
	if err != nil {
		return nil, fmt.Errorf("failed to query commissions: %w", err)
	}
	defer rows.Close()

	var commissions []CommissionWithRelations
	for rows.Next() {
		commission, err := scanCommission(rows)
		if err != nil {
			return nil, err
		}
		commissions = append(commissions, commission)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read commissions: %w", err)
	}
	if commissions == nil {
		commissions = []CommissionWithRelations{}
	}
	return commissions, nil
}

func (r *Repository) UpdateStatus(ids []string, status string) error {
	if len(ids) == 0 {
		return nil
	}
	for _, id := range ids {
		if _, err := r.db.Exec(`UPDATE commissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, status, id); err != nil {
			return fmt.Errorf("failed to update commission status: %w", err)
		}
	}
	return nil
}

type commissionScanner interface {
	Scan(dest ...interface{}) error
}

func scanCommission(scanner commissionScanner) (CommissionWithRelations, error) {
	var result CommissionWithRelations
	var staffID, staffName, staffRole sql.NullString
	var transactionID, transactionCode sql.NullString
	err := scanner.Scan(
		&result.ID, &result.StaffID, &result.StaffRole, &result.TransactionID,
		&result.TransactionItemID, &result.BaseAmount, &result.CommissionType,
		&result.CommissionValue, &result.CommissionAmount, &result.Status,
		&result.CreatedAt, &result.UpdatedAt, &staffID, &staffName, &staffRole,
		&transactionID, &transactionCode,
	)
	if err != nil {
		return CommissionWithRelations{}, err
	}
	if staffID.Valid {
		result.Staff = &StaffSummary{ID: staffID.String, FullName: staffName.String, Role: staffRole.String}
	}
	if transactionID.Valid {
		result.Transaction = &TransactionSummary{ID: transactionID.String, TransactionCode: transactionCode.String}
	}
	return result, nil
}
