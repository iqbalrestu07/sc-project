package transaction

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

type TransactionWithRelations struct {
	models.Transaction
	Patient *PatientSummary                `json:"patient,omitempty"`
	Items   []TransactionItemWithRelations `json:"items,omitempty"`
}

type TransactionItemWithRelations struct {
	models.TransactionItem
	Service   *NamedSummary `json:"service,omitempty"`
	Product   *NamedSummary `json:"product,omitempty"`
	Doctor    *NamedSummary `json:"doctor,omitempty"`
	Therapist *NamedSummary `json:"therapist,omitempty"`
}

type PatientSummary struct {
	ID          string  `json:"id"`
	FullName    string  `json:"full_name"`
	PatientCode string  `json:"patient_code"`
	Phone       *string `json:"phone,omitempty"`
	WhatsApp    *string `json:"whatsapp,omitempty"`
}

type NamedSummary struct {
	ID       string `json:"id"`
	Name     string `json:"name,omitempty"`
	FullName string `json:"full_name,omitempty"`
}

type CreateRequest struct {
	Transaction models.Transaction       `json:"transaction"`
	Items       []models.TransactionItem `json:"items"`
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) List(orgID string) ([]TransactionWithRelations, error) {
	rows, err := r.db.Query(`
		SELECT t.id, t.transaction_code, t.appointment_id, t.patient_id, t.subtotal,
		       t.discount_amount, t.discount_type, t.total_amount, COALESCE(t.tax_amount, 0),
		       t.payment_method, t.payment_status, t.notes, t.created_by, t.paid_at,
		       t.created_at, t.updated_at, p.id, p.full_name, p.patient_code, p.phone, p.whatsapp
		FROM transactions t
		LEFT JOIN patients p ON p.id = t.patient_id
		WHERE (t.organization_id = $1 OR ($1::text = '' AND t.organization_id IS NULL))
		  AND t.deleted_at IS NULL
		ORDER BY t.created_at DESC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query transactions: %w", err)
	}
	defer rows.Close()

	var transactions []TransactionWithRelations
	for rows.Next() {
		transaction, err := scanTransaction(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, transaction)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read transactions: %w", err)
	}
	for i := range transactions {
		items, err := r.Items(transactions[i].ID)
		if err != nil {
			return nil, err
		}
		transactions[i].Items = items
	}
	if transactions == nil {
		transactions = []TransactionWithRelations{}
	}
	return transactions, nil
}

func (r *Repository) Get(id, orgID string) (*TransactionWithRelations, error) {
	row := r.db.QueryRow(`
		SELECT t.id, t.transaction_code, t.appointment_id, t.patient_id, t.subtotal,
		       t.discount_amount, t.discount_type, t.total_amount, COALESCE(t.tax_amount, 0),
		       t.payment_method, t.payment_status, t.notes, t.created_by, t.paid_at,
		       t.created_at, t.updated_at, p.id, p.full_name, p.patient_code, p.phone, p.whatsapp
		FROM transactions t
		LEFT JOIN patients p ON p.id = t.patient_id
		WHERE t.id = $1
		  AND (t.organization_id = $2 OR ($2::text = '' AND t.organization_id IS NULL))
		  AND t.deleted_at IS NULL
	`, id, orgID)
	transaction, err := scanTransaction(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	items, err := r.Items(id)
	if err != nil {
		return nil, err
	}
	transaction.Items = items
	return &transaction, nil
}

func (r *Repository) Create(req CreateRequest, orgID string) (*TransactionWithRelations, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	var orgVal interface{}
	if orgID != "" {
		orgVal = orgID
	}

	if _, err := tx.Exec(`
		INSERT INTO transactions (
			id, transaction_code, appointment_id, patient_id, subtotal, discount_amount,
			discount_type, total_amount, tax_amount, payment_method, payment_status,
			notes, created_by, paid_at, organization_id, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`, req.Transaction.ID, req.Transaction.TransactionCode, req.Transaction.AppointmentID,
		req.Transaction.PatientID, req.Transaction.Subtotal, req.Transaction.DiscountAmount,
		req.Transaction.DiscountType, req.Transaction.TotalAmount, req.Transaction.TaxAmount,
		req.Transaction.PaymentMethod, req.Transaction.PaymentStatus, req.Transaction.Notes,
		req.Transaction.CreatedBy, req.Transaction.PaidAt, orgVal, req.Transaction.CreatedAt,
		req.Transaction.UpdatedAt); err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	for _, item := range req.Items {
		if _, err := tx.Exec(`
			INSERT INTO transaction_items (
				id, transaction_id, item_type, service_id, product_id, quantity,
				unit_price, discount_amount, total_price, doctor_id, therapist_id, created_at, created_by
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`, item.ID, req.Transaction.ID, item.ItemType, item.ServiceID, item.ProductID,
			item.Quantity, item.UnitPrice, item.DiscountAmount, item.TotalPrice,
			item.DoctorID, item.TherapistID, item.CreatedAt, item.CreatedBy); err != nil {
			return nil, fmt.Errorf("failed to create transaction item: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}
	return r.Get(req.Transaction.ID, orgID)
}

func (r *Repository) Update(id, orgID, userByID string, updates models.Transaction) error {
	result, err := r.db.Exec(`
		UPDATE transactions
		SET payment_status = COALESCE(NULLIF($1, ''), payment_status),
		    payment_method = COALESCE($2, payment_method),
		    paid_at = CASE
		        WHEN $1 = 'paid' AND paid_at IS NULL THEN COALESCE($3, CURRENT_TIMESTAMP)
		        ELSE COALESCE($3, paid_at)
		    END,
		    notes = COALESCE($4, notes),
		    updated_by = $6,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		  AND (organization_id = $7 OR ($7::text = '' AND organization_id IS NULL))
	`, updates.PaymentStatus, updates.PaymentMethod, updates.PaidAt, updates.Notes, id,
		nullableString(userByID), orgID)
	if err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id, orgID, userByID string) error {
	result, err := r.db.Exec(`
		UPDATE transactions
		SET deleted_at = NOW(), payment_status = 'cancelled', updated_by = $3
		WHERE id = $1
		  AND (organization_id = $2 OR ($2::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL`,
		id, orgID, nullableString(userByID))
	if err != nil {
		return fmt.Errorf("failed to delete transaction: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Items(transactionID string) ([]TransactionItemWithRelations, error) {
	rows, err := r.db.Query(`
		SELECT ti.id, ti.transaction_id, ti.item_type, ti.service_id, ti.product_id,
		       ti.quantity, ti.unit_price, ti.discount_amount, ti.total_price,
		       ti.doctor_id, ti.therapist_id, ti.created_at,
		       s.id, s.name, p.id, p.name, d.id, d.full_name, th.id, th.full_name
		FROM transaction_items ti
		LEFT JOIN services s ON s.id = ti.service_id
		LEFT JOIN products p ON p.id = ti.product_id
		LEFT JOIN staff d ON d.id = ti.doctor_id
		LEFT JOIN staff th ON th.id = ti.therapist_id
		WHERE ti.transaction_id = $1
		ORDER BY ti.created_at ASC
	`, transactionID)
	if err != nil {
		return nil, fmt.Errorf("failed to query transaction items: %w", err)
	}
	defer rows.Close()

	var items []TransactionItemWithRelations
	for rows.Next() {
		item, err := scanTransactionItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read transaction items: %w", err)
	}
	if items == nil {
		items = []TransactionItemWithRelations{}
	}
	return items, nil
}

type paidItemRow struct {
	itemID, itemType            string
	productID, serviceID        sql.NullString
	doctorID, therapistID       sql.NullString
	quantity                    int
	totalPrice                  float64
	doctorType, therapistType   string
	doctorValue, therapistValue float64
}

func (r *Repository) MarkPaidEffects(transactionID, userByID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin payment effects: %w", err)
	}
	defer tx.Rollback()

	// Step 1: collect all item rows first, then close the cursor before
	// issuing any further DML. Running additional queries (commission check)
	// while a pq Rows cursor is still open causes "unexpected Parse response 'C'".
	rows, err := tx.Query(`
		SELECT ti.id, ti.item_type, ti.product_id, ti.service_id, ti.quantity, ti.total_price,
		       ti.doctor_id, ti.therapist_id,
		       COALESCE(s.doctor_commission_type, 'fixed'), COALESCE(s.doctor_commission_value, 0),
		       COALESCE(s.therapist_commission_type, 'fixed'), COALESCE(s.therapist_commission_value, 0)
		FROM transaction_items ti
		LEFT JOIN services s ON s.id = ti.service_id
		WHERE ti.transaction_id = $1
	`, transactionID)
	if err != nil {
		return fmt.Errorf("failed to load payment items: %w", err)
	}

	var items []paidItemRow
	for rows.Next() {
		var row paidItemRow
		if err := rows.Scan(&row.itemID, &row.itemType, &row.productID, &row.serviceID,
			&row.quantity, &row.totalPrice, &row.doctorID, &row.therapistID,
			&row.doctorType, &row.doctorValue, &row.therapistType, &row.therapistValue); err != nil {
			rows.Close()
			return fmt.Errorf("failed to scan payment item: %w", err)
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("failed to read payment items: %w", err)
	}
	rows.Close() // explicitly close before issuing DML inside the same tx

	// Step 2: apply side-effects now that the cursor is closed
	for _, row := range items {
		if row.itemType == "product" && row.productID.Valid {
			if _, err := tx.Exec(`UPDATE products SET current_stock = GREATEST(COALESCE(current_stock, 0) - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $2`, row.quantity, row.productID.String); err != nil {
				return fmt.Errorf("failed to decrease stock: %w", err)
			}
		}
		if row.serviceID.Valid && row.doctorID.Valid {
			if err := r.insertCommission(tx, row.doctorID.String, "doctor", transactionID, row.itemID, userByID, row.totalPrice, row.doctorType, row.doctorValue); err != nil {
				return err
			}
		}
		if row.serviceID.Valid && row.therapistID.Valid {
			if err := r.insertCommission(tx, row.therapistID.String, "therapist", transactionID, row.itemID, userByID, row.totalPrice, row.therapistType, row.therapistValue); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (r *Repository) insertCommission(tx *sql.Tx, staffID, staffRole, transactionID, itemID, createdBy string, baseAmount float64, commissionType string, commissionValue float64) error {
	var exists bool
	if err := tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM commissions WHERE staff_id = $1 AND transaction_item_id = $2)`, staffID, itemID).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check commission: %w", err)
	}
	if exists || commissionValue <= 0 {
		return nil
	}
	amount := commissionValue
	if commissionType == "percentage" {
		amount = baseAmount * commissionValue / 100
	}
	_, err := tx.Exec(`
		INSERT INTO commissions (
			id, staff_id, staff_role, transaction_id, transaction_item_id, base_amount,
			commission_type, commission_value, commission_amount, status, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, uuid.New().String(), staffID, staffRole, transactionID, itemID, baseAmount, commissionType, commissionValue, amount, nullableString(createdBy))
	if err != nil {
		return fmt.Errorf("failed to insert commission: %w", err)
	}
	return nil
}

type txScanner interface {
	Scan(dest ...interface{}) error
}

func scanTransaction(scanner txScanner) (TransactionWithRelations, error) {
	var result TransactionWithRelations
	var patientID, patientName, patientCode, patientPhone, patientWhatsApp sql.NullString
	err := scanner.Scan(
		&result.ID, &result.TransactionCode, &result.AppointmentID, &result.PatientID,
		&result.Subtotal, &result.DiscountAmount, &result.DiscountType, &result.TotalAmount,
		&result.TaxAmount, &result.PaymentMethod, &result.PaymentStatus, &result.Notes,
		&result.CreatedBy, &result.PaidAt, &result.CreatedAt, &result.UpdatedAt,
		&patientID, &patientName, &patientCode, &patientPhone, &patientWhatsApp,
	)
	if err != nil {
		return TransactionWithRelations{}, err
	}
	if patientID.Valid {
		result.Patient = &PatientSummary{ID: patientID.String, FullName: patientName.String, PatientCode: patientCode.String}
		if patientPhone.Valid {
			result.Patient.Phone = &patientPhone.String
		}
		if patientWhatsApp.Valid {
			result.Patient.WhatsApp = &patientWhatsApp.String
		}
	}
	return result, nil
}

func scanTransactionItem(scanner txScanner) (TransactionItemWithRelations, error) {
	var result TransactionItemWithRelations
	var serviceID, serviceName, productID, productName sql.NullString
	var doctorID, doctorName, therapistID, therapistName sql.NullString
	err := scanner.Scan(
		&result.ID, &result.TransactionID, &result.ItemType, &result.ServiceID,
		&result.ProductID, &result.Quantity, &result.UnitPrice, &result.DiscountAmount,
		&result.TotalPrice, &result.DoctorID, &result.TherapistID, &result.CreatedAt,
		&serviceID, &serviceName, &productID, &productName, &doctorID, &doctorName,
		&therapistID, &therapistName,
	)
	if err != nil {
		return TransactionItemWithRelations{}, err
	}
	if serviceID.Valid {
		result.Service = &NamedSummary{ID: serviceID.String, Name: serviceName.String}
	}
	if productID.Valid {
		result.Product = &NamedSummary{ID: productID.String, Name: productName.String}
	}
	if doctorID.Valid {
		result.Doctor = &NamedSummary{ID: doctorID.String, FullName: doctorName.String}
	}
	if therapistID.Valid {
		result.Therapist = &NamedSummary{ID: therapistID.String, FullName: therapistName.String}
	}
	return result, nil
}

func nextTransactionCode(now time.Time) string {
	return fmt.Sprintf("TRX-%s-%s", now.Format("20060102"), uuid.New().String()[:8])
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

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
