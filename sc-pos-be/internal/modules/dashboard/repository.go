package dashboard

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/sc-pos/backend/internal/database"
)

// jakartaLoc is the canonical Asia/Jakarta timezone (UTC+7) for this package.
var jakartaLoc = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*60*60)
	}
	return loc
}()

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

// DateRange holds optional from/to filter (nil = no filter)
type DateRange struct {
	From *time.Time
	To   *time.Time
}

func (r *Repository) Stats(dr DateRange, orgID string) (map[string]interface{}, error) {
	var patients, appointmentsToday, paidTransactionsToday, lowStockProducts int
	var revenueToday float64

	if err := r.db.QueryRow(`SELECT COUNT(*) FROM patients WHERE COALESCE(is_active, true) = true AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))`, orgID).Scan(&patients); err != nil {
		return nil, fmt.Errorf("failed to count patients: %w", err)
	}
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM appointments WHERE scheduled_at AT TIME ZONE 'Asia/Jakarta' >= CURRENT_DATE AND scheduled_at AT TIME ZONE 'Asia/Jakarta' < CURRENT_DATE + INTERVAL '1 day' AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))`, orgID).Scan(&appointmentsToday); err != nil {
		return nil, fmt.Errorf("failed to count appointments: %w", err)
	}

	// With optional date range filter; fall back to "today" when no filter given
	if dr.From != nil && dr.To != nil {
		if err := r.db.QueryRow(`
			SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
			FROM transactions
			WHERE payment_status = 'paid'
			  AND COALESCE(paid_at, updated_at) >= $1
			  AND COALESCE(paid_at, updated_at) < $2
			  AND (organization_id = $3 OR ($3::text = '' AND organization_id IS NULL))
		`, dr.From, dr.To, orgID).Scan(&paidTransactionsToday, &revenueToday); err != nil {
			return nil, fmt.Errorf("failed to calculate revenue: %w", err)
		}
	} else {
		// No filter: use "today" in Asia/Jakarta.
		// We compute today's boundaries in UTC and pass them as params to avoid
		// relying on the PostgreSQL server's local timezone.
		now := time.Now().In(jakartaLoc)
		todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jakartaLoc).UTC()
		todayEnd := todayStart.Add(24 * time.Hour)
		if err := r.db.QueryRow(`
			SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
			FROM transactions
			WHERE payment_status = 'paid'
			  AND COALESCE(paid_at, updated_at) >= $1
			  AND COALESCE(paid_at, updated_at) < $2
			  AND (organization_id = $3 OR ($3::text = '' AND organization_id IS NULL))
		`, todayStart, todayEnd, orgID).Scan(&paidTransactionsToday, &revenueToday); err != nil {
			return nil, fmt.Errorf("failed to calculate revenue: %w", err)
		}
	}

	if err := r.db.QueryRow(`SELECT COUNT(*) FROM products WHERE COALESCE(is_active, true) = true AND COALESCE(current_stock, 0) <= COALESCE(minimum_stock, 5) AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))`, orgID).Scan(&lowStockProducts); err != nil {
		return nil, fmt.Errorf("failed to count low stock products: %w", err)
	}

	return map[string]interface{}{
		"patients":                patients,
		"appointments_today":      appointmentsToday,
		"paid_transactions_today": paidTransactionsToday,
		"revenue_today":           revenueToday,
		"low_stock_products":      lowStockProducts,
	}, nil
}

type RevenueRow struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
}

func (r *Repository) Revenue(dr DateRange, orgID string) ([]RevenueRow, error) {
	var query string
	var args []interface{}

	if dr.From != nil && dr.To != nil {
		query = `
			SELECT (COALESCE(paid_at, updated_at))::date AS date,
			       COALESCE(SUM(total_amount), 0)::float8 AS revenue
			FROM transactions
			WHERE payment_status = 'paid'
			  AND COALESCE(paid_at, updated_at) >= $1
			  AND COALESCE(paid_at, updated_at) < $2
			  AND (organization_id = $3 OR ($3::text = '' AND organization_id IS NULL))
			GROUP BY 1 ORDER BY 1 DESC LIMIT 366`
		args = []interface{}{dr.From, dr.To, orgID}
	} else {
		query = `
			SELECT (COALESCE(paid_at, updated_at) AT TIME ZONE 'Asia/Jakarta')::date AS date,
			       COALESCE(SUM(total_amount), 0)::float8 AS revenue
			FROM transactions
			WHERE payment_status = 'paid'
			  AND (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
			GROUP BY 1 ORDER BY 1 DESC LIMIT 30`
		args = []interface{}{orgID}
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query revenue: %w", err)
	}
	defer rows.Close()

	var result []RevenueRow
	for rows.Next() {
		var date time.Time
		var revenue float64
		if err := rows.Scan(&date, &revenue); err != nil {
			return nil, fmt.Errorf("failed to scan revenue row: %w", err)
		}
		result = append(result, RevenueRow{
			Date:    date.Format("2006-01-02"),
			Revenue: revenue,
		})
	}
	if result == nil {
		result = []RevenueRow{}
	}
	return result, nil
}

type TopItem struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
	Revenue  float64 `json:"revenue"`
}

func (r *Repository) TopServices(dr DateRange, orgID string, page, limit int) ([]TopItem, bool, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit
	fetchLimit := limit + 1
	var rows *sql.Rows
	var err error
	if dr.From != nil && dr.To != nil {
		rows, err = r.db.Query(`
			SELECT s.id, s.name, COUNT(*)::float8 AS quantity, COALESCE(SUM(ti.total_price), 0)::float8 AS revenue
			FROM transaction_items ti
			JOIN services s ON s.id = ti.service_id
			JOIN transactions t ON t.id = ti.transaction_id
			WHERE t.payment_status = 'paid'
			  AND COALESCE(t.paid_at, t.updated_at) >= $1
			  AND COALESCE(t.paid_at, t.updated_at) < $2
			  AND (t.organization_id = $3 OR ($3::text = '' AND t.organization_id IS NULL))
			GROUP BY s.id, s.name
			ORDER BY revenue DESC
			LIMIT $4 OFFSET $5
		`, dr.From, dr.To, orgID, fetchLimit, offset)
	} else {
		rows, err = r.db.Query(`
			SELECT s.id, s.name, COUNT(*)::float8 AS quantity, COALESCE(SUM(ti.total_price), 0)::float8 AS revenue
			FROM transaction_items ti
			JOIN services s ON s.id = ti.service_id
			JOIN transactions t ON t.id = ti.transaction_id
			WHERE t.payment_status = 'paid'
			  AND (t.organization_id = $1 OR ($1::text = '' AND t.organization_id IS NULL))
			GROUP BY s.id, s.name
			ORDER BY revenue DESC
			LIMIT $2 OFFSET $3
		`, orgID, fetchLimit, offset)
	}
	if err != nil {
		return nil, false, fmt.Errorf("failed to query top services: %w", err)
	}
	defer rows.Close()
	items, err := scanTopItems(rows)
	if err != nil {
		return nil, false, err
	}
	hasNext := false
	if len(items) > limit {
		hasNext = true
		items = items[:limit]
	}
	return items, hasNext, nil
}

func (r *Repository) TopProducts(dr DateRange, orgID string, page, limit int) ([]TopItem, bool, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit
	fetchLimit := limit + 1
	var rows *sql.Rows
	var err error
	if dr.From != nil && dr.To != nil {
		rows, err = r.db.Query(`
			SELECT p.id, p.name, COALESCE(SUM(ti.quantity), 0)::float8 AS quantity, COALESCE(SUM(ti.total_price), 0)::float8 AS revenue
			FROM transaction_items ti
			JOIN products p ON p.id = ti.product_id
			JOIN transactions t ON t.id = ti.transaction_id
			WHERE t.payment_status = 'paid'
			  AND COALESCE(t.paid_at, t.updated_at) >= $1
			  AND COALESCE(t.paid_at, t.updated_at) < $2
			  AND (t.organization_id = $3 OR ($3::text = '' AND t.organization_id IS NULL))
			GROUP BY p.id, p.name
			ORDER BY revenue DESC
			LIMIT $4 OFFSET $5
		`, dr.From, dr.To, orgID, fetchLimit, offset)
	} else {
		rows, err = r.db.Query(`
			SELECT p.id, p.name, COALESCE(SUM(ti.quantity), 0)::float8 AS quantity, COALESCE(SUM(ti.total_price), 0)::float8 AS revenue
			FROM transaction_items ti
			JOIN products p ON p.id = ti.product_id
			JOIN transactions t ON t.id = ti.transaction_id
			WHERE t.payment_status = 'paid'
			  AND (t.organization_id = $1 OR ($1::text = '' AND t.organization_id IS NULL))
			GROUP BY p.id, p.name
			ORDER BY revenue DESC
			LIMIT $2 OFFSET $3
		`, orgID, fetchLimit, offset)
	}
	if err != nil {
		return nil, false, fmt.Errorf("failed to query top products: %w", err)
	}
	defer rows.Close()
	items, err := scanTopItems(rows)
	if err != nil {
		return nil, false, err
	}
	hasNext := false
	if len(items) > limit {
		hasNext = true
		items = items[:limit]
	}
	return items, hasNext, nil
}

func scanTopItems(rows *sql.Rows) ([]TopItem, error) {
	var result []TopItem
	for rows.Next() {
		var item TopItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Quantity, &item.Revenue); err != nil {
			return nil, fmt.Errorf("failed to scan top item: %w", err)
		}
		result = append(result, item)
	}
	if result == nil {
		result = []TopItem{}
	}
	return result, nil
}

// TopCustomerRow holds aggregated spending data per patient.
type TopCustomerRow struct {
	PatientID   string  `json:"patient_id"`
	PatientCode string  `json:"patient_code"`
	FullName    string  `json:"full_name"`
	TotalSpend  float64 `json:"total_spend"`
	TxCount     int     `json:"tx_count"`
}

func (r *Repository) TopCustomers(dr DateRange, orgID string, limit int) ([]TopCustomerRow, error) {
	if limit <= 0 {
		limit = 5
	}
	var rows *sql.Rows
	var err error
	if dr.From != nil && dr.To != nil {
		rows, err = r.db.Query(`
			SELECT p.id, p.patient_code, p.full_name,
			       COALESCE(SUM(t.total_amount), 0)::float8  AS total_spend,
			       COUNT(t.id)                               AS tx_count
			FROM transactions t
			JOIN patients p ON p.id = t.patient_id
			WHERE t.payment_status = 'paid'
			  AND COALESCE(t.paid_at, t.updated_at) >= $1
			  AND COALESCE(t.paid_at, t.updated_at) < $2
			  AND (t.organization_id = $3 OR ($3::text = '' AND t.organization_id IS NULL))
			GROUP BY p.id, p.patient_code, p.full_name
			ORDER BY total_spend DESC
			LIMIT $4
		`, dr.From, dr.To, orgID, limit)
	} else {
		rows, err = r.db.Query(`
			SELECT p.id, p.patient_code, p.full_name,
			       COALESCE(SUM(t.total_amount), 0)::float8  AS total_spend,
			       COUNT(t.id)                               AS tx_count
			FROM transactions t
			JOIN patients p ON p.id = t.patient_id
			WHERE t.payment_status = 'paid'
			  AND (t.organization_id = $1 OR ($1::text = '' AND t.organization_id IS NULL))
			GROUP BY p.id, p.patient_code, p.full_name
			ORDER BY total_spend DESC
			LIMIT $2
		`, orgID, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query top customers: %w", err)
	}
	defer rows.Close()

	var result []TopCustomerRow
	for rows.Next() {
		var row TopCustomerRow
		if err := rows.Scan(&row.PatientID, &row.PatientCode, &row.FullName,
			&row.TotalSpend, &row.TxCount); err != nil {
			return nil, fmt.Errorf("failed to scan top customer: %w", err)
		}
		result = append(result, row)
	}
	if result == nil {
		result = []TopCustomerRow{}
	}
	return result, nil
}

type AppointmentTodayRow struct {
	ID          string    `json:"id"`
	ScheduledAt time.Time `json:"scheduled_at"`
	Status      string    `json:"status"`
	PatientName string    `json:"patient_name"`
	ServiceName string    `json:"service_name"`
}

func (r *Repository) AppointmentsToday(orgID string) ([]AppointmentTodayRow, error) {
	rows, err := r.db.Query(`
		SELECT a.id, a.scheduled_at, a.status,
		       COALESCE(p.full_name, '') AS patient_name,
		       COALESCE(s.name, '') AS service_name
		FROM appointments a
		LEFT JOIN patients p ON p.id = a.patient_id
		LEFT JOIN services s ON s.id = a.service_id
		WHERE a.scheduled_at AT TIME ZONE 'Asia/Jakarta' >= CURRENT_DATE
		  AND a.scheduled_at AT TIME ZONE 'Asia/Jakarta' < CURRENT_DATE + INTERVAL '1 day'
		  AND (a.organization_id = $1 OR ($1::text = '' AND a.organization_id IS NULL))
		ORDER BY a.scheduled_at ASC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query appointments today: %w", err)
	}
	defer rows.Close()

	var result []AppointmentTodayRow
	for rows.Next() {
		var row AppointmentTodayRow
		if err := rows.Scan(&row.ID, &row.ScheduledAt, &row.Status, &row.PatientName, &row.ServiceName); err != nil {
			return nil, fmt.Errorf("failed to scan appointment today: %w", err)
		}
		result = append(result, row)
	}
	if result == nil {
		result = []AppointmentTodayRow{}
	}
	return result, nil
}
