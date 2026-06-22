package dashboard

import (
	"database/sql"
	"fmt"

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
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM appointments WHERE scheduled_at::date = CURRENT_DATE`).Scan(&appointmentsToday); err != nil {
		return nil, fmt.Errorf("failed to count appointments: %w", err)
	}
	if err := r.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM transactions WHERE payment_status = 'paid' AND created_at::date = CURRENT_DATE`).Scan(&paidTransactionsToday, &revenueToday); err != nil {
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

func (r *Repository) Revenue() ([]map[string]interface{}, error) {
	rows, err := r.db.Query(`
		SELECT created_at::date AS date, COALESCE(SUM(total_amount), 0) AS revenue
		FROM transactions
		WHERE payment_status = 'paid'
		GROUP BY created_at::date
		ORDER BY date DESC
		LIMIT 30
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query revenue: %w", err)
	}
	defer rows.Close()
	return scanMaps(rows, "date", "revenue")
}

func (r *Repository) TopServices() ([]map[string]interface{}, error) {
	rows, err := r.db.Query(`
		SELECT s.id, s.name, COUNT(*) AS quantity, COALESCE(SUM(ti.total_price), 0) AS revenue
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
	return scanMaps(rows, "id", "name", "quantity", "revenue")
}

func (r *Repository) TopProducts() ([]map[string]interface{}, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.name, SUM(ti.quantity) AS quantity, COALESCE(SUM(ti.total_price), 0) AS revenue
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
	return scanMaps(rows, "id", "name", "quantity", "revenue")
}

func (r *Repository) AppointmentsToday() ([]map[string]interface{}, error) {
	rows, err := r.db.Query(`
		SELECT a.id, a.scheduled_at, a.status, p.full_name AS patient_name, s.name AS service_name
		FROM appointments a
		LEFT JOIN patients p ON p.id = a.patient_id
		LEFT JOIN services s ON s.id = a.service_id
		WHERE a.scheduled_at::date = CURRENT_DATE
		ORDER BY a.scheduled_at ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query appointments today: %w", err)
	}
	defer rows.Close()
	return scanMaps(rows, "id", "scheduled_at", "status", "patient_name", "service_name")
}

func scanMaps(rows *sql.Rows, columns ...string) ([]map[string]interface{}, error) {
	var result []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		scanTargets := make([]interface{}, len(columns))
		for i := range values {
			scanTargets[i] = &values[i]
		}
		if err := rows.Scan(scanTargets...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		item := map[string]interface{}{}
		for i, column := range columns {
			item[column] = values[i]
		}
		result = append(result, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read rows: %w", err)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}
