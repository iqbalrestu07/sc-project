package whatsapp

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/database"
)

type Repository struct{}

func NewRepository() *Repository {
	return &Repository{}
}

// ── Templates ───────────────────────────────────────────────────────────────

func (r *Repository) GetTemplates(orgID string) ([]Template, error) {
	query := `SELECT id, name, content, organization_id, created_at, updated_at 
	          FROM whatsapp_templates WHERE organization_id = $1 ORDER BY created_at DESC`
	
	rows, err := database.DB.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Name, &t.Content, &t.OrganizationID, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *Repository) GetTemplateByID(id, orgID string) (*Template, error) {
	query := `SELECT id, name, content, organization_id, created_at, updated_at 
	          FROM whatsapp_templates WHERE id = $1 AND organization_id = $2`
	
	var t Template
	err := database.DB.QueryRow(query, id, orgID).Scan(
		&t.ID, &t.Name, &t.Content, &t.OrganizationID, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *Repository) CreateTemplate(t *Template) error {
	t.ID = uuid.New().String()
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now

	query := `INSERT INTO whatsapp_templates (id, name, content, organization_id, created_at, updated_at) 
	          VALUES ($1, $2, $3, $4, $5, $6)`
	
	_, err := database.DB.Exec(query, t.ID, t.Name, t.Content, t.OrganizationID, t.CreatedAt, t.UpdatedAt)
	return err
}

// ── Devices ─────────────────────────────────────────────────────────────────

func (r *Repository) GetDeviceJID(orgID string) (string, error) {
	query := `SELECT jid FROM clinic_whatsapp_devices WHERE organization_id = $1`
	var jid string
	err := database.DB.QueryRow(query, orgID).Scan(&jid)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return jid, nil
}

func (r *Repository) SaveDeviceJID(orgID, jid string) error {
	query := `
		INSERT INTO clinic_whatsapp_devices (organization_id, jid) 
		VALUES ($1, $2)
		ON CONFLICT (organization_id) DO UPDATE SET jid = EXCLUDED.jid, created_at = CURRENT_TIMESTAMP
	`
	_, err := database.DB.Exec(query, orgID, jid)
	return err
}

func (r *Repository) DeleteDeviceJID(orgID string) error {
	query := `DELETE FROM clinic_whatsapp_devices WHERE organization_id = $1`
	_, err := database.DB.Exec(query, orgID)
	return err
}
