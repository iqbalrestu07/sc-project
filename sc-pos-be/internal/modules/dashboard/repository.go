package dashboard

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/sc-pos/backend/internal/database"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) Stats() (map[string]interface{}, error) {
	var patients, appointmentsToday, paidTransactionsToday, lowStockProducts int
	var revenueToday float64

	if err := r.db.QueryRow(`SELECT COUNT(*) FROM patients WHERE COALESCE(is_active, true) = true`).Scan(&patients); err != nil {
		return nil, fmt.Errorf("failed to count patients: %w", err)
	}
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM appointments WHERE scheduled_at AT TIME ZONE 'Asia/Jakarta' >= CURRENT_DATE AND scheduled_at AT TIME ZONE 'Asia/Jakarta' < CURRENT_DATE + INTERVAL '1 day'`).Scan(&appointmentsToday); err != nil {
		return nil, fmt.Errorf("failed to count appointments: %w", err)
	}
	// Use paid_at for "paid today" — not created_at
	if err := r.db.QueryRow(`
		SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE payment_status = 'paid'
		  AND COALESCE(paid_at, updated_at) AT TIME ZONE 'Asia/Jakarta' >= CURRENT_DATE
		  AND COALESCE(paid_at, updated_at) AT TIME ZONE 'Asia/Jakarta' < CURRENT_DATE + INTERVAL '1 day'
	`).Scan(&paidTransactionsToday, &revenueToday); err != nil {
		return nil, fmt.Errorf("failed to calculate revenue: %w", err)
	}
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM products WHERE COALESCE(is_active, true) = true AND COALESCE(current_stock, 0) <= COALESCE(minimum_stock, 5)`).Scan(&lowStockProducts); err != nil {
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

func (r *Repository) Revenue() ([]RevenueRow, error) {
	rows, err := r.db.Query(`
		SELECT (COALESCE(paid_at, updated_at) AT TIME ZONE 'Asia/Jakarta')::date AS date,
		       COALESCE(SUM(total_amount), 0)::float8 AS revenue
		FROM transactions
		WHERE payment_status = 'paid'
		GROUP BY 1
		ORDER BY 1 DESC
		LIMIT 30
	`)
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

func (r *Repository) TopServices() ([]TopItem, error) {
	rows, err := r.db.Query(`
		SELECT s.id, s.name, COUNT(*)::float8 AS quantity, COALESCE(SUM(ti.total_price), 0)::float8 AS revenue
		FROM transaction_items ti
		JOIN services s ON s.id = ti.service_id
		GROUP BY s.id, s.name
		ORDER BY revenue DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query top services: %w", err)
	}
	defer rows.Close()
	return scanTopItems(rows)
}

func (r *Repository) TopProducts() ([]TopItem, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.name, COALESCE(SUM(ti.quantity), 0)::float8 AS quantity, COALESCE(SUM(ti.total_price), 0)::float8 AS revenue
		FROM transaction_items ti
		JOIN products p ON p.id = ti.product_id
		GROUP BY p.id, p.name
		ORDER BY revenue DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query top products: %w", err)
	}
	defer rows.Close()
	return scanTopItems(rows)
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

type AppointmentTodayRow struct {
	ID          string    `json:"id"`
	ScheduledAt time.Time `json:"scheduled_at"`
	Status      string    `json:"status"`
	PatientName string    `json:"patient_name"`
	ServiceName string    `json:"service_name"`
}

func (r *Repository) AppointmentsToday() ([]AppointmentTodayRow, error) {
	rows, err := r.db.Query(`
		SELECT a.id, a.scheduled_at, a.status,
		       COALESCE(p.full_name, '') AS patient_name,
		       COALESCE(s.name, '') AS service_name
		FROM appointments a
		LEFT JOIN patients p ON p.id = a.patient_id
		LEFT JOIN services s ON s.id = a.service_id
		WHERE a.scheduled_at AT TIME ZONE 'Asia/Jakarta' >= CURRENT_DATE
		  AND a.scheduled_at AT TIME ZONE 'Asia/Jakarta' < CURRENT_DATE + INTERVAL '1 day'
		ORDER BY a.scheduled_at ASC
	`)
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
