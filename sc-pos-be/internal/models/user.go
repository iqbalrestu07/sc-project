package models

import "time"

// User represents system user
type User struct {
	ID        string    `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	Role      string    `json:"role" db:"role"` // legacy global role; effective role comes from org membership
	FullName  string    `json:"full_name,omitempty" db:"full_name"`
	AvatarURL string    `json:"avatar_url,omitempty" db:"avatar_url"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
