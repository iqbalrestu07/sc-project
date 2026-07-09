package transaction

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
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
		// Default commission_eligible to true for service items when not explicitly provided.
		commEligible := item.CommissionEligible
		if item.ItemType == "service" && commEligible == nil {
			t := true
			commEligible = &t
		}
		if _, err := tx.Exec(`
			INSERT INTO transaction_items (
				id, transaction_id, item_type, service_id, product_id, quantity,
				unit_price, discount_amount, discount_type, total_price,
				doctor_id, therapist_id, commission_eligible, commission_notes,
				selected_consumable_product_id,
				created_at, created_by
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		`, item.ID, req.Transaction.ID, item.ItemType, item.ServiceID, item.ProductID,
			item.Quantity, item.UnitPrice, item.DiscountAmount, item.DiscountType, item.TotalPrice,
			item.DoctorID, item.TherapistID, commEligible, item.CommissionNotes,
			item.SelectedConsumableProductID,
			item.CreatedAt, item.CreatedBy); err != nil {
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
		       ti.quantity, ti.unit_price, ti.discount_amount, ti.discount_type, ti.total_price,
		       ti.doctor_id, ti.therapist_id, ti.created_at,
		       COALESCE(ti.commission_eligible, TRUE), ti.commission_notes,
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
	itemID, itemType      string
	productID, serviceID  sql.NullString
	doctorID, therapistID sql.NullString
	quantity              int
	totalPrice            float64
	// Handling commission (PIC / mengerjakan tindakan — selalu diberikan jika staff assigned)
	doctorHandlingType, therapistHandlingType   string
	doctorHandlingValue, therapistHandlingValue float64
	// Offering commission (terapis menawarkan dan pasien setuju — diberikan hanya jika eligible)
	doctorOfferingType, therapistOfferingType   sql.NullString
	doctorOfferingValue, therapistOfferingValue sql.NullFloat64
	// Whether offering commission is eligible for this item
	commissionEligible sql.NullBool
	// Consumable product chosen by cashier for this service item
	selectedConsumableProductID sql.NullString
}

func (r *Repository) MarkPaidEffects(transactionID, userByID, orgID string) error {
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
		       COALESCE(s.doctor_commission_type,   p.doctor_commission_type,   'fixed'),
		       COALESCE(s.doctor_commission_value,  p.doctor_commission_value,  0),
		       COALESCE(s.therapist_commission_type,  p.therapist_commission_type,  'fixed'),
		       COALESCE(s.therapist_commission_value, p.therapist_commission_value, 0),
		       COALESCE(s.doctor_offering_commission_type,    p.doctor_offering_commission_type),
		       COALESCE(s.doctor_offering_commission_value,   p.doctor_offering_commission_value),
		       COALESCE(s.therapist_offering_commission_type,  p.therapist_offering_commission_type),
		       COALESCE(s.therapist_offering_commission_value, p.therapist_offering_commission_value),
		       COALESCE(ti.commission_eligible, TRUE),
		       ti.selected_consumable_product_id
		FROM transaction_items ti
		LEFT JOIN services  s ON s.id = ti.service_id
		LEFT JOIN products  p ON p.id = ti.product_id
		WHERE ti.transaction_id = $1
	`, transactionID)
	if err != nil {
		return fmt.Errorf("failed to load payment items: %w", err)
	}

	var items []paidItemRow
	for rows.Next() {
		var row paidItemRow
		if err := rows.Scan(
			&row.itemID, &row.itemType, &row.productID, &row.serviceID,
			&row.quantity, &row.totalPrice, &row.doctorID, &row.therapistID,
			&row.doctorHandlingType, &row.doctorHandlingValue,
			&row.therapistHandlingType, &row.therapistHandlingValue,
			&row.doctorOfferingType, &row.doctorOfferingValue,
			&row.therapistOfferingType, &row.therapistOfferingValue,
			&row.commissionEligible, &row.selectedConsumableProductID); err != nil {
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

	// Step 2a: validate consumable stock BEFORE any mutations.
	// If any selected consumable product has insufficient stock, abort the whole transaction.
	for _, row := range items {
		if row.itemType == "service" && row.selectedConsumableProductID.Valid {
			var available int
			var productName string
			// Determine required quantity from the group definition
			var required float64
			err = tx.QueryRow(`
				SELECT COALESCE(p.current_stock, 0), p.name,
				       COALESCE(scg.quantity_used, 1) * $2
				FROM products p
				LEFT JOIN service_consumable_groups scg
					ON scg.service_id = $3 AND scg.deleted_at IS NULL
				WHERE p.id = $1
				LIMIT 1
			`, row.selectedConsumableProductID.String, row.quantity, row.serviceID).
				Scan(&available, &productName, &required)
			if err != nil {
				return fmt.Errorf("failed to check consumable stock for product %s: %w",
					row.selectedConsumableProductID.String, err)
			}
			if float64(available) < required {
				return fmt.Errorf(
					"stok %s tidak cukup: dibutuhkan %.0f, tersedia %d. Transaksi dibatalkan",
					productName, required, available)
			}
		}
	}

	// Step 2b: apply side-effects now that the cursor is closed
	for _, row := range items {
		// 2b-i: deduct stock for retail product items
		if row.itemType == "product" && row.productID.Valid {
			var currStock, minStock int
			var prodName string
			err = tx.QueryRow(`UPDATE products SET current_stock = GREATEST(COALESCE(current_stock, 0) - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING current_stock, minimum_stock, name`, row.quantity, row.productID.String).Scan(&currStock, &minStock, &prodName)
			if err != nil {
				return fmt.Errorf("failed to decrease stock: %w", err)
			}

			if currStock <= minStock {
				// Fire low stock alert
				go func(org, pName string, cur, min int) {
					waService := whatsapp.NewService()
					waService.SendLowStockAlert(org, pName, cur, min)
				}(orgID, prodName, currStock, minStock)
			}
			// Record stock movement for audit trail
			refType := "transaction"
			reason := "usage"
			movID := uuid.New().String()
			negQty := -row.quantity // store as negative so direction is explicit
			if _, err := tx.Exec(`
				INSERT INTO stock_movements
					(id, product_id, movement_type, quantity, reason, reference_id, reference_type,
					 created_by, organization_id, created_at)
				VALUES ($1, $2, 'out', $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
			`, movID, row.productID.String, negQty, reason, transactionID, refType,
				nullableString(userByID), nullableString(orgID)); err != nil {
				return fmt.Errorf("failed to record stock movement: %w", err)
			}
		}

		// 2b-ii: deduct stock for consumable product used in a service item
		if row.itemType == "service" && row.selectedConsumableProductID.Valid {
			var required float64
			err = tx.QueryRow(`
				SELECT COALESCE(scg.quantity_used, 1) * $2
				FROM service_consumable_groups scg
				WHERE scg.service_id = $1 AND scg.deleted_at IS NULL
				LIMIT 1
			`, row.serviceID, row.quantity).Scan(&required)
			if err != nil && err != sql.ErrNoRows {
				return fmt.Errorf("failed to load consumable qty: %w", err)
			}
			if required <= 0 {
				required = float64(row.quantity) // fallback: 1 unit per session
			}

			var currStock, minStock int
			var prodName string
			err = tx.QueryRow(`
				UPDATE products
				SET current_stock = GREATEST(COALESCE(current_stock, 0) - $1, 0),
				    updated_at = CURRENT_TIMESTAMP
				WHERE id = $2
				RETURNING current_stock, minimum_stock, name
			`, required, row.selectedConsumableProductID.String).Scan(&currStock, &minStock, &prodName)
			if err != nil {
				return fmt.Errorf("failed to deduct consumable stock: %w", err)
			}

			if currStock <= minStock {
				go func(org, pName string, cur, min int) {
					waService := whatsapp.NewService()
					waService.SendLowStockAlert(org, pName, cur, min)
				}(orgID, prodName, currStock, minStock)
			}

			movID := uuid.New().String()
			negRequired := -required
			if _, err := tx.Exec(`
				INSERT INTO stock_movements
					(id, product_id, movement_type, quantity, reason, reference_id, reference_type,
					 created_by, organization_id, created_at)
				VALUES ($1, $2, 'out', $3, 'service_consumable', $4, 'transaction', $5, $6, CURRENT_TIMESTAMP)
			`, movID, row.selectedConsumableProductID.String, negRequired, transactionID,
				nullableString(userByID), nullableString(orgID)); err != nil {
				return fmt.Errorf("failed to record consumable movement: %w", err)
			}
		}

		// Commission rules apply to both service items and product items.
		// Logic: jika staff menawarkan (offering eligible), maka HANYA offering yang diberikan
		//        karena yang menawarkan sudah pasti yang mengerjakan — tidak perlu double komisi.
		//        Jika tidak eligible offering, maka berikan handling.
		isEligible := !row.commissionEligible.Valid || row.commissionEligible.Bool

		if row.serviceID.Valid {
			// Doctor commission
			if row.doctorID.Valid {
				if isEligible && row.doctorOfferingType.Valid && row.doctorOfferingValue.Valid && row.doctorOfferingValue.Float64 > 0 {
					// Offering supersedes handling
					if err := r.insertCommission(tx, row.doctorID.String, "doctor", "offering", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.doctorOfferingType.String, row.doctorOfferingValue.Float64); err != nil {
						return err
					}
				} else {
					// Fallback to handling
					if err := r.insertCommission(tx, row.doctorID.String, "doctor", "handling", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.doctorHandlingType, row.doctorHandlingValue); err != nil {
						return err
					}
				}
			}
			// Therapist commission
			if row.therapistID.Valid {
				if isEligible && row.therapistOfferingType.Valid && row.therapistOfferingValue.Valid && row.therapistOfferingValue.Float64 > 0 {
					// Offering supersedes handling
					if err := r.insertCommission(tx, row.therapistID.String, "therapist", "offering", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.therapistOfferingType.String, row.therapistOfferingValue.Float64); err != nil {
						return err
					}
				} else {
					// Fallback to handling
					if err := r.insertCommission(tx, row.therapistID.String, "therapist", "handling", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.therapistHandlingType, row.therapistHandlingValue); err != nil {
						return err
					}
				}
			}
		}
		if row.itemType == "product" && row.productID.Valid {
			// Doctor commission for product
			if row.doctorID.Valid {
				if isEligible && row.doctorOfferingType.Valid && row.doctorOfferingValue.Valid && row.doctorOfferingValue.Float64 > 0 {
					if err := r.insertCommission(tx, row.doctorID.String, "doctor", "offering", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.doctorOfferingType.String, row.doctorOfferingValue.Float64); err != nil {
						return err
					}
				} else {
					if err := r.insertCommission(tx, row.doctorID.String, "doctor", "handling", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.doctorHandlingType, row.doctorHandlingValue); err != nil {
						return err
					}
				}
			}
			// Therapist commission for product
			if row.therapistID.Valid {
				if isEligible && row.therapistOfferingType.Valid && row.therapistOfferingValue.Valid && row.therapistOfferingValue.Float64 > 0 {
					if err := r.insertCommission(tx, row.therapistID.String, "therapist", "offering", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.therapistOfferingType.String, row.therapistOfferingValue.Float64); err != nil {
						return err
					}
				} else {
					if err := r.insertCommission(tx, row.therapistID.String, "therapist", "handling", transactionID, row.itemID, userByID, orgID, row.totalPrice, row.therapistHandlingType, row.therapistHandlingValue); err != nil {
						return err
					}
				}
			}
		}
	}
	return tx.Commit()
}

func (r *Repository) insertCommission(tx *sql.Tx, staffID, staffRole, reason, transactionID, itemID, createdBy, orgID string, baseAmount float64, commissionType string, commissionValue float64) error {
	if commissionValue <= 0 {
		return nil
	}
	// Deduplicate per staff + item + reason so re-running is idempotent.
	var exists bool
	if err := tx.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM commissions WHERE staff_id = $1 AND transaction_item_id = $2 AND COALESCE(commission_reason, '') = $3)`,
		staffID, itemID, reason,
	).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check commission: %w", err)
	}
	if exists {
		return nil
	}
	amount := commissionValue
	if commissionType == "percentage" {
		amount = baseAmount * commissionValue / 100
	}
	_, err := tx.Exec(`
		INSERT INTO commissions (
			id, staff_id, staff_role, transaction_id, transaction_item_id, base_amount,
			commission_type, commission_value, commission_amount, commission_reason,
			status, organization_id, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, uuid.New().String(), staffID, staffRole, transactionID, itemID, baseAmount,
		commissionType, commissionValue, amount, reason,
		nullableString(orgID), nullableString(createdBy))
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
	var commissionEligible sql.NullBool
	var commissionNotes sql.NullString
	err := scanner.Scan(
		&result.ID, &result.TransactionID, &result.ItemType, &result.ServiceID,
		&result.ProductID, &result.Quantity, &result.UnitPrice, &result.DiscountAmount,
		&result.DiscountType, &result.TotalPrice, &result.DoctorID, &result.TherapistID, &result.CreatedAt,
		&commissionEligible, &commissionNotes,
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
	if commissionEligible.Valid {
		result.CommissionEligible = &commissionEligible.Bool
	} else {
		t := true
		result.CommissionEligible = &t // default true for backward compat
	}
	if commissionNotes.Valid {
		result.CommissionNotes = &commissionNotes.String
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
