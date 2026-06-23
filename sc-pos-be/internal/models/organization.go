package models

import "time"

// Organization adalah unit klinik/bisnis dalam sistem SaaS
type Organization struct {
	ID          string     `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	Slug        string     `json:"slug" db:"slug"`
	Description string     `json:"description,omitempty" db:"description"`
	LogoURL     string     `json:"logo_url,omitempty" db:"logo_url"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedBy   string     `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy   *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// OrganizationMember adalah relasi User <-> Organization + role dalam org tersebut
type OrganizationMember struct {
	ID        string     `json:"id" db:"id"`
	OrgID     string     `json:"org_id" db:"org_id"`
	UserID    string     `json:"user_id" db:"user_id"`
	Role      string     `json:"role" db:"role"` // admin, doctor, therapist, cashier
	IsActive  bool       `json:"is_active" db:"is_active"`
	JoinedAt  time.Time  `json:"joined_at" db:"joined_at"`
	CreatedBy *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	// Join fields
	UserEmail    string `json:"user_email,omitempty" db:"user_email"`
	UserFullName string `json:"user_full_name,omitempty" db:"user_full_name"`
	OrgName      string `json:"org_name,omitempty" db:"org_name"`
}

// OrganizationWithRole digunakan untuk list org milik user (dengan role di org tsb)
type OrganizationWithRole struct {
	Organization
	Role string `json:"role"`
}

// Permission adalah definisi akses granular (e.g. "patients:read")
type Permission struct {
	ID          string `json:"id" db:"id"` // format: "resource:action"
	Resource    string `json:"resource" db:"resource"`
	Action      string `json:"action" db:"action"`
	Description string `json:"description,omitempty" db:"description"`
}

// RolePermission adalah mapping default role → permission
type RolePermission struct {
	ID           string `json:"id" db:"id"`
	Role         string `json:"role" db:"role"`
	PermissionID string `json:"permission_id" db:"permission_id"`
}

// UserPermission adalah extra permission yang diberikan admin kepada user tertentu dalam org
type UserPermission struct {
	ID           string `json:"id" db:"id"`
	UserID       string `json:"user_id" db:"user_id"`
	OrgID        string `json:"org_id" db:"org_id"`
	PermissionID string `json:"permission_id" db:"permission_id"`
	GrantedBy    string `json:"granted_by,omitempty" db:"granted_by"`
	GrantedAt    string `json:"granted_at,omitempty" db:"granted_at"`
	// Join fields
	PermissionDescription string `json:"permission_description,omitempty" db:"permission_description"`
}
