package rbac

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

// ── Permissions ──────────────────────────────────────────────────────────────

func (r *Repository) ListAllPermissions() ([]models.Permission, error) {
	rows, err := r.db.Query(`SELECT id, resource, action, COALESCE(description, '') FROM permissions ORDER BY resource, action`)
	if err != nil {
		return nil, fmt.Errorf("failed to list permissions: %w", err)
	}
	defer rows.Close()

	var perms []models.Permission
	for rows.Next() {
		var p models.Permission
		if err := rows.Scan(&p.ID, &p.Resource, &p.Action, &p.Description); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// ── Role Permissions ─────────────────────────────────────────────────────────

func (r *Repository) GetRolePermissions(role string) ([]string, error) {
	rows, err := r.db.Query(`SELECT permission_id FROM role_permissions WHERE role = $1 ORDER BY permission_id`, role)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// GetAllRolePermissions returns a map[role][]permissionID
func (r *Repository) GetAllRolePermissions() (map[string][]string, error) {
	rows, err := r.db.Query(`SELECT role, permission_id FROM role_permissions ORDER BY role, permission_id`)
	if err != nil {
		return nil, fmt.Errorf("failed to get all role permissions: %w", err)
	}
	defer rows.Close()

	result := make(map[string][]string)
	for rows.Next() {
		var role, permID string
		if err := rows.Scan(&role, &permID); err != nil {
			return nil, err
		}
		result[role] = append(result[role], permID)
	}
	return result, nil
}

func (r *Repository) SetRolePermissions(role string, permissionIDs []string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Remove all current permissions for this role
	if _, err := tx.Exec(`DELETE FROM role_permissions WHERE role = $1`, role); err != nil {
		return fmt.Errorf("failed to clear role permissions: %w", err)
	}

	// Insert new permissions
	for _, permID := range permissionIDs {
		if _, err := tx.Exec(
			`INSERT INTO role_permissions (id, role, permission_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			uuid.New().String(), role, permID,
		); err != nil {
			return fmt.Errorf("failed to insert role permission %s: %w", permID, err)
		}
	}

	return tx.Commit()
}

// ── User Permissions ─────────────────────────────────────────────────────────

// GetUserExtraPermissions returns extra (non-role-default) permissions for a user in an org
func (r *Repository) GetUserExtraPermissions(userID, orgID string) ([]models.UserPermission, error) {
	rows, err := r.db.Query(`
		SELECT up.id, up.user_id, up.org_id, up.permission_id,
			   COALESCE(up.granted_by, ''), COALESCE(up.granted_at::text, ''),
			   COALESCE(p.description, '')
		FROM user_permissions up
		JOIN permissions p ON p.id = up.permission_id
		WHERE up.user_id = $1 AND up.org_id = $2
		ORDER BY up.permission_id`, userID, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}
	defer rows.Close()

	var perms []models.UserPermission
	for rows.Next() {
		var p models.UserPermission
		if err := rows.Scan(&p.ID, &p.UserID, &p.OrgID, &p.PermissionID, &p.GrantedBy, &p.GrantedAt, &p.PermissionDescription); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

func (r *Repository) GrantUserPermission(userID, orgID, permissionID, grantedBy string) error {
	query := `
		INSERT INTO user_permissions (id, user_id, org_id, permission_id, granted_by, granted_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, org_id, permission_id) DO NOTHING`
	_, err := r.db.Exec(query, uuid.New().String(), userID, orgID, permissionID, grantedBy, time.Now())
	if err != nil {
		return fmt.Errorf("failed to grant user permission: %w", err)
	}
	return nil
}

func (r *Repository) RevokeUserPermission(userID, orgID, permissionID string) error {
	_, err := r.db.Exec(
		`DELETE FROM user_permissions WHERE user_id = $1 AND org_id = $2 AND permission_id = $3`,
		userID, orgID, permissionID,
	)
	if err != nil {
		return fmt.Errorf("failed to revoke user permission: %w", err)
	}
	return nil
}

// GetEffectivePermissions returns the combined set of permissions for a user in an org:
// role_permissions (for their role) + user_permissions (extra grants)
func (r *Repository) GetEffectivePermissions(userID, orgID, role string) ([]string, error) {
	query := `
		SELECT DISTINCT permission_id FROM (
			SELECT rp.permission_id
			FROM role_permissions rp
			WHERE rp.role = $1
			UNION
			SELECT up.permission_id
			FROM user_permissions up
			WHERE up.user_id = $2 AND up.org_id = $3
		) combined
		ORDER BY permission_id`

	rows, err := r.db.Query(query, role, userID, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get effective permissions: %w", err)
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

// HasPermission checks if a user has a specific permission in an org (efficient single query)
func (r *Repository) HasPermission(userID, orgID, role, permissionID string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM role_permissions WHERE role = $1 AND permission_id = $4
			UNION
			SELECT 1 FROM user_permissions WHERE user_id = $2 AND org_id = $3 AND permission_id = $4
		)`

	var exists bool
	err := r.db.QueryRow(query, role, userID, orgID, permissionID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check permission: %w", err)
	}
	return exists, nil
}
