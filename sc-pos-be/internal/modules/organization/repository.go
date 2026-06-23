package organization

import (
	"database/sql"
	"fmt"
	"strings"
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

// ── Organizations ────────────────────────────────────────────────────────────

func (r *Repository) Create(org *models.Organization) error {
	query := `
		INSERT INTO organizations (id, name, slug, description, logo_url, is_active, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.Exec(query,
		org.ID, org.Name, org.Slug, org.Description, org.LogoURL,
		org.IsActive, org.CreatedBy, org.CreatedAt, org.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create organization: %w", err)
	}
	return nil
}

func (r *Repository) GetByID(id string) (*models.Organization, error) {
	query := `SELECT id, name, slug, description, logo_url, is_active, created_by, created_at, updated_at
		FROM organizations WHERE id = $1 AND is_active = true`
	var org models.Organization
	err := r.db.QueryRow(query, id).Scan(
		&org.ID, &org.Name, &org.Slug, &org.Description, &org.LogoURL,
		&org.IsActive, &org.CreatedBy, &org.CreatedAt, &org.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}
	return &org, nil
}

func (r *Repository) GetBySlug(slug string) (*models.Organization, error) {
	query := `SELECT id, name, slug, description, logo_url, is_active, created_by, created_at, updated_at
		FROM organizations WHERE slug = $1`
	var org models.Organization
	err := r.db.QueryRow(query, slug).Scan(
		&org.ID, &org.Name, &org.Slug, &org.Description, &org.LogoURL,
		&org.IsActive, &org.CreatedBy, &org.CreatedAt, &org.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get organization by slug: %w", err)
	}
	return &org, nil
}

func (r *Repository) Update(org *models.Organization) error {
	query := `UPDATE organizations
		SET name = $1, description = $2, logo_url = $3, updated_at = $4
		WHERE id = $5`
	_, err := r.db.Exec(query, org.Name, org.Description, org.LogoURL, time.Now(), org.ID)
	if err != nil {
		return fmt.Errorf("failed to update organization: %w", err)
	}
	return nil
}

func (r *Repository) Delete(id string) error {
	query := `UPDATE organizations SET is_active = false, updated_at = $1 WHERE id = $2`
	_, err := r.db.Exec(query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to delete organization: %w", err)
	}
	return nil
}

// GetUserOrganizations returns all active organizations a user belongs to (with their role in each)
func (r *Repository) GetUserOrganizations(userID string) ([]models.OrganizationWithRole, error) {
	query := `
		SELECT o.id, o.name, o.slug, o.description, o.logo_url, o.is_active, o.created_by, o.created_at, o.updated_at,
			   om.role
		FROM organizations o
		JOIN organization_members om ON om.org_id = o.id
		WHERE om.user_id = $1 AND om.is_active = true AND o.is_active = true
		ORDER BY om.joined_at ASC`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user organizations: %w", err)
	}
	defer rows.Close()

	var orgs []models.OrganizationWithRole
	for rows.Next() {
		var o models.OrganizationWithRole
		if err := rows.Scan(
			&o.ID, &o.Name, &o.Slug, &o.Description, &o.LogoURL,
			&o.IsActive, &o.CreatedBy, &o.CreatedAt, &o.UpdatedAt, &o.Role,
		); err != nil {
			return nil, fmt.Errorf("failed to scan org: %w", err)
		}
		orgs = append(orgs, o)
	}
	return orgs, nil
}

// ── Organization Members ─────────────────────────────────────────────────────

func (r *Repository) AddMember(orgID, userID, role, addedBy string) error {
	now := time.Now()
	query := `
		INSERT INTO organization_members (id, org_id, user_id, role, is_active, joined_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, true, $5, $5, $5)
		ON CONFLICT (org_id, user_id) DO UPDATE SET role = $4, is_active = true, updated_at = $5`
	_, err := r.db.Exec(query, uuid.New().String(), orgID, userID, role, now)
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}
	return nil
}

func (r *Repository) GetMember(orgID, userID string) (*models.OrganizationMember, error) {
	query := `
		SELECT om.id, om.org_id, om.user_id, om.role, om.is_active, om.joined_at, om.created_at, om.updated_at,
			   u.email, COALESCE(u.full_name, '') as full_name
		FROM organization_members om
		JOIN users u ON u.id = om.user_id
		WHERE om.org_id = $1 AND om.user_id = $2 AND om.is_active = true`

	var m models.OrganizationMember
	err := r.db.QueryRow(query, orgID, userID).Scan(
		&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.IsActive, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
		&m.UserEmail, &m.UserFullName,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get member: %w", err)
	}
	return &m, nil
}

func (r *Repository) ListMembers(orgID string) ([]models.OrganizationMember, error) {
	query := `
		SELECT om.id, om.org_id, om.user_id, om.role, om.is_active, om.joined_at, om.created_at, om.updated_at,
			   u.email, COALESCE(u.full_name, '') as full_name
		FROM organization_members om
		JOIN users u ON u.id = om.user_id
		WHERE om.org_id = $1 AND om.is_active = true
		ORDER BY om.joined_at ASC`

	rows, err := r.db.Query(query, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list members: %w", err)
	}
	defer rows.Close()

	var members []models.OrganizationMember
	for rows.Next() {
		var m models.OrganizationMember
		if err := rows.Scan(
			&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.IsActive, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
			&m.UserEmail, &m.UserFullName,
		); err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *Repository) UpdateMemberRole(orgID, userID, role string) error {
	query := `UPDATE organization_members SET role = $1, updated_at = $2 WHERE org_id = $3 AND user_id = $4`
	_, err := r.db.Exec(query, role, time.Now(), orgID, userID)
	if err != nil {
		return fmt.Errorf("failed to update member role: %w", err)
	}
	return nil
}

func (r *Repository) RemoveMember(orgID, userID string) error {
	query := `UPDATE organization_members SET is_active = false, updated_at = $1 WHERE org_id = $2 AND user_id = $3`
	_, err := r.db.Exec(query, time.Now(), orgID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}
	return nil
}

// GenerateUniqueSlug generates a URL-safe slug from org name, appending a suffix if taken
func (r *Repository) GenerateUniqueSlug(name string) (string, error) {
	base := slugify(name)
	slug := base
	for i := 1; i <= 99; i++ {
		existing, err := r.GetBySlug(slug)
		if err != nil {
			return "", err
		}
		if existing == nil {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
	return fmt.Sprintf("%s-%s", base, uuid.New().String()[:8]), nil
}

func slugify(s string) string {
	s = strings.ToLower(s)
	result := strings.Builder{}
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			result.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			result.WriteRune('-')
		}
	}
	return strings.Trim(result.String(), "-")
}
