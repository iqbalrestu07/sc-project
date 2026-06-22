package authmodule

import (
	"database/sql"
	"fmt"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) GetByEmail(email string) (*models.User, error) {
	query := `SELECT id, email, password, role, created_at, updated_at FROM users WHERE email = $1`

	var user models.User
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Email, &user.Password, &user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	}

	return &user, nil
}

func (r *Repository) Create(user *models.User) error {
	query := `
		INSERT INTO users (id, email, password, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	if _, err := r.db.Exec(query, user.ID, user.Email, user.Password, user.Role, user.CreatedAt, user.UpdatedAt); err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}
