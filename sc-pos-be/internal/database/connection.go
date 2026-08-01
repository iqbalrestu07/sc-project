package database

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect(dsn string) error {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	DB = db
	return nil
}

// WithTx runs fn inside a database transaction.
// If fn returns nil, the transaction is committed.
// If fn returns an error, the transaction is rolled back.
// This is used by bulk import operations to wrap many upserts in a single
// transaction, reducing WAL fsync from N (per-statement) to 1 (at COMMIT).
func WithTx(fn func(*sql.Tx) error) error {
	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	committed := false
	defer func() {
		if !committed {
			tx.Rollback()
		}
	}()
	if err := fn(tx); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	committed = true
	return nil
}

func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
