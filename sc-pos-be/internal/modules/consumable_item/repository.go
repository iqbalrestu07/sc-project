package consumable_item

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

// ConsumableUsageLogWithProduct enriches the base log with product details.
type ConsumableUsageLogWithProduct struct {
	models.ConsumableUsageLog
	ProductName string  `json:"product_name"`
	ProductUnit string  `json:"product_unit"`
	CurrentStock int    `json:"current_stock"`
}

// ListParams holds optional filter parameters for ListUsageLogs.
type ListParams struct {
	ProductID    string
	UsagePurpose string
	From         *time.Time
	To           *time.Time
	OrgID        string
}

// ListConsumableProducts returns all products flagged as consumable for the given org.
func (r *Repository) ListConsumableProducts(orgID string) ([]models.Product, error) {
	rows, err := r.db.Query(`
		SELECT id, name, category, sku, supplier, purchase_price, selling_price,
		       COALESCE(current_stock, 0), COALESCE(minimum_stock, 0), unit,
		       expiry_date, COALESCE(is_active, true),
		       COALESCE(is_consumable, false), consumable_category,
		       created_at, updated_at
		FROM products
		WHERE COALESCE(is_consumable, false) = true
		  AND COALESCE(is_active, true) = true
		  AND deleted_at IS NULL
		  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		ORDER BY name ASC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query consumable products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		p, err := scanConsumableProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read consumable products: %w", err)
	}
	if products == nil {
		products = []models.Product{}
	}
	return products, nil
}

// CreateUsageLog inserts a new usage log record and decreases the product stock atomically.
func (r *Repository) CreateUsageLog(log *models.ConsumableUsageLog, orgID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	log.ID = uuid.New().String()
	log.CreatedAt = time.Now()

	orgVal := nullableString(orgID)

	if _, err := tx.Exec(`
		INSERT INTO consumable_usage_logs (
			id, product_id, quantity, usage_purpose,
			reference_id, reference_type, patient_name, service_name,
			notes, organization_id, created_by, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
	`, log.ID, log.ProductID, log.Quantity, log.UsagePurpose,
		log.ReferenceID, log.ReferenceType, log.PatientName, log.ServiceName,
		log.Notes, orgVal, log.CreatedBy, log.CreatedAt); err != nil {
		return fmt.Errorf("failed to insert consumable usage log: %w", err)
	}

	// Deduct stock — floor at 0
	if _, err := tx.Exec(`
		UPDATE products
		SET current_stock = GREATEST(0, COALESCE(current_stock, 0) - $1),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
		  AND (organization_id = $3 OR ($3::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, log.Quantity, log.ProductID, orgVal); err != nil {
		return fmt.Errorf("failed to deduct product stock: %w", err)
	}

	// Mirror the usage as a stock_movements record (type: out) for unified audit trail
	movementID := uuid.New().String()
	reason := log.UsagePurpose
	if _, err := tx.Exec(`
		INSERT INTO stock_movements (
			id, product_id, movement_type, quantity, reason,
			reference_id, reference_type, notes,
			organization_id, created_by, created_at
		) VALUES ($1,$2,'out',$3,$4,$5,$6,$7,$8,$9,$10)
	`, movementID, log.ProductID, log.Quantity, reason,
		log.ReferenceID, log.ReferenceType, log.Notes,
		orgVal, log.CreatedBy, log.CreatedAt); err != nil {
		return fmt.Errorf("failed to mirror stock movement: %w", err)
	}

	return tx.Commit()
}

// ListUsageLogs returns usage logs with product info, optionally filtered.
func (r *Repository) ListUsageLogs(params ListParams) ([]ConsumableUsageLogWithProduct, error) {
	args := []interface{}{}
	idx := 1

	where := fmt.Sprintf(
		`(cul.organization_id = $%d OR ($%d::text = '' AND cul.organization_id IS NULL))`,
		idx, idx,
	)
	args = append(args, params.OrgID)
	idx++

	if params.ProductID != "" {
		where += fmt.Sprintf(` AND cul.product_id = $%d`, idx)
		args = append(args, params.ProductID)
		idx++
	}
	if params.UsagePurpose != "" {
		where += fmt.Sprintf(` AND cul.usage_purpose = $%d`, idx)
		args = append(args, params.UsagePurpose)
		idx++
	}
	if params.From != nil {
		where += fmt.Sprintf(` AND cul.created_at >= $%d`, idx)
		args = append(args, params.From)
		idx++
	}
	if params.To != nil {
		where += fmt.Sprintf(` AND cul.created_at <= $%d`, idx)
		args = append(args, params.To)
		idx++
	}

	query := `
		SELECT cul.id, cul.product_id, cul.quantity, cul.usage_purpose,
		       cul.reference_id, cul.reference_type, cul.patient_name, cul.service_name,
		       cul.notes, cul.organization_id, cul.created_by, cul.created_at,
		       COALESCE(p.name, ''), COALESCE(p.unit, 'pcs'),
		       COALESCE(p.current_stock, 0)
		FROM consumable_usage_logs cul
		LEFT JOIN products p ON p.id = cul.product_id
		WHERE ` + where + `
		ORDER BY cul.created_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query usage logs: %w", err)
	}
	defer rows.Close()

	var logs []ConsumableUsageLogWithProduct
	for rows.Next() {
		var l ConsumableUsageLogWithProduct
		var refID, refType, patientName, serviceName, notes, orgID, createdBy sql.NullString
		if err := rows.Scan(
			&l.ID, &l.ProductID, &l.Quantity, &l.UsagePurpose,
			&refID, &refType, &patientName, &serviceName,
			&notes, &orgID, &createdBy, &l.CreatedAt,
			&l.ProductName, &l.ProductUnit, &l.CurrentStock,
		); err != nil {
			return nil, fmt.Errorf("failed to scan usage log: %w", err)
		}
		if refID.Valid      { l.ReferenceID   = &refID.String }
		if refType.Valid    { l.ReferenceType  = &refType.String }
		if patientName.Valid { l.PatientName   = &patientName.String }
		if serviceName.Valid { l.ServiceName   = &serviceName.String }
		if notes.Valid      { l.Notes          = &notes.String }
		if orgID.Valid      { l.OrganizationID = &orgID.String }
		if createdBy.Valid  { l.CreatedBy      = &createdBy.String }
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read usage logs: %w", err)
	}
	if logs == nil {
		logs = []ConsumableUsageLogWithProduct{}
	}
	return logs, nil
}

// MarkConsumable sets the is_consumable flag and optional consumable_category on a product.
func (r *Repository) MarkConsumable(productID, orgID, userID string, isConsumable bool, category *string) error {
	result, err := r.db.Exec(`
		UPDATE products
		SET is_consumable = $1, consumable_category = $2,
		    updated_by = $3, updated_at = NOW()
		WHERE id = $4
		  AND (organization_id = $5 OR ($5::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
	`, isConsumable, category, nullableString(userID), productID, nullableString(orgID))
	if err != nil {
		return fmt.Errorf("failed to update consumable flag: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ─── helpers ────────────────────────────────────────────────────────────────

type productScanner interface {
	Scan(dest ...interface{}) error
}

func scanConsumableProduct(scanner productScanner) (models.Product, error) {
	var p models.Product
	err := scanner.Scan(
		&p.ID, &p.Name, &p.Category, &p.Sku,
		&p.Supplier, &p.PurchasePrice, &p.SellingPrice,
		&p.CurrentStock, &p.MinimumStock, &p.Unit,
		&p.ExpiryDate, &p.IsActive,
		&p.IsConsumable, &p.ConsumableCategory,
		&p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
