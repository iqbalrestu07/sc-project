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

func (r *Repository) UpdateTemplate(id, orgID, name, content string) error {
	query := `UPDATE whatsapp_templates SET name = $1, content = $2, updated_at = NOW() WHERE id = $3 AND organization_id = $4`
	_, err := database.DB.Exec(query, name, content, id, orgID)
	return err
}

func (r *Repository) DeleteTemplate(id, orgID string) error {
	query := `DELETE FROM whatsapp_templates WHERE id = $1 AND organization_id = $2`
	_, err := database.DB.Exec(query, id, orgID)
	return err
}

// ── Devices ─────────────────────────────────────────────────────────────────

func (r *Repository) GetDevices(orgID string) ([]WhatsappDevice, error) {
	query := `SELECT id, organization_id, name, jid, created_at FROM clinic_whatsapp_devices WHERE organization_id = $1 ORDER BY created_at ASC`
	rows, err := database.DB.Query(query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []WhatsappDevice
	for rows.Next() {
		var d WhatsappDevice
		if err := rows.Scan(&d.ID, &d.OrganizationID, &d.Name, &d.JID, &d.CreatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	return devices, nil
}

func (r *Repository) GetDeviceJID(orgID, deviceID string) (string, error) {
	// If deviceID is empty, try to get the first device (for legacy fallback)
	var query string
	var args []interface{}
	
	if deviceID == "" {
		query = `SELECT jid FROM clinic_whatsapp_devices WHERE organization_id = $1 ORDER BY created_at ASC LIMIT 1`
		args = []interface{}{orgID}
	} else {
		query = `SELECT jid FROM clinic_whatsapp_devices WHERE organization_id = $1 AND id = $2`
		args = []interface{}{orgID, deviceID}
	}
	
	var jid string
	err := database.DB.QueryRow(query, args...).Scan(&jid)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return jid, nil
}

func (r *Repository) GetDeviceByJID(jid string) (*WhatsappDevice, error) {
	query := `SELECT id, organization_id, name, jid, created_at FROM clinic_whatsapp_devices WHERE jid = $1 LIMIT 1`
	var d WhatsappDevice
	err := database.DB.QueryRow(query, jid).Scan(&d.ID, &d.OrganizationID, &d.Name, &d.JID, &d.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

func (r *Repository) SaveDevice(d *WhatsappDevice) error {
	query := `
		INSERT INTO clinic_whatsapp_devices (id, organization_id, name, jid) 
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (organization_id, jid) DO UPDATE SET name = EXCLUDED.name
	`
	_, err := database.DB.Exec(query, d.ID, d.OrganizationID, d.Name, d.JID)
	return err
}

func (r *Repository) DeleteDevice(orgID, deviceID string) error {
	query := `DELETE FROM clinic_whatsapp_devices WHERE organization_id = $1 AND id = $2`
	_, err := database.DB.Exec(query, orgID, deviceID)
	return err
}
