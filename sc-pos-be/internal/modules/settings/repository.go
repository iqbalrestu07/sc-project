package settings

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

func (r *Repository) GetClinic(orgID string) (*models.ClinicSettings, error) {
	row := r.db.QueryRow(`
		SELECT id, clinic_name, address, phone, email, tax_rate, tax_inclusive,
		       low_stock_alerts, appointment_reminders, expiry_warnings,
		       reminder_hours_before, whatsapp_reminder_enabled, email_reminder_enabled,
		       whatsapp_business_phone_id, invoice_header_title,
		       invoice_header_description, invoice_footer_text,
		       wa_invoice_header_title, wa_invoice_header_description, wa_invoice_footer_text,
		       maps_embed_url, logo_url, favicon_url, created_at, updated_at
		FROM clinic_settings
		WHERE (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
		ORDER BY created_at ASC
		LIMIT 1
	`, orgID)
	return scanAndReturn(row)
}

// GetFirstClinic returns the first active clinic settings regardless of org,
// intended for public/unauthenticated access in single-tenant deployments.
func (r *Repository) GetFirstClinic() (*models.ClinicSettings, error) {
	row := r.db.QueryRow(`
		SELECT id, clinic_name, address, phone, email, tax_rate, tax_inclusive,
		       low_stock_alerts, appointment_reminders, expiry_warnings,
		       reminder_hours_before, whatsapp_reminder_enabled, email_reminder_enabled,
		       whatsapp_business_phone_id, invoice_header_title,
		       invoice_header_description, invoice_footer_text,
		       wa_invoice_header_title, wa_invoice_header_description, wa_invoice_footer_text,
		       maps_embed_url, logo_url, favicon_url, created_at, updated_at
		FROM clinic_settings
		WHERE deleted_at IS NULL
		ORDER BY created_at ASC
		LIMIT 1
	`)
	return scanAndReturn(row)
}

func scanAndReturn(row *sql.Row) (*models.ClinicSettings, error) {
	settings, err := scanClinicSettings(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *Repository) Create(settings *models.ClinicSettings, orgID string) error {
	_, err := r.db.Exec(`
		INSERT INTO clinic_settings (
			id, clinic_name, address, phone, email, tax_rate, tax_inclusive,
			low_stock_alerts, appointment_reminders, expiry_warnings,
			reminder_hours_before, whatsapp_reminder_enabled, email_reminder_enabled,
			whatsapp_business_phone_id, invoice_header_title, invoice_header_description,
			invoice_footer_text, wa_invoice_header_title, wa_invoice_header_description,
			wa_invoice_footer_text, maps_embed_url, logo_url, favicon_url,
			created_at, updated_at, organization_id, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
	`, settings.ID, settings.ClinicName, settings.Address, settings.Phone, settings.Email,
		settings.TaxRate, settings.TaxInclusive, settings.LowStockAlerts,
		settings.AppointmentReminders, settings.ExpiryWarnings, settings.ReminderHoursBefore,
		settings.WhatsAppReminderEnabled, settings.EmailReminderEnabled,
		settings.WhatsAppBusinessPhoneID, settings.InvoiceHeaderTitle,
		settings.InvoiceHeaderDescription, settings.InvoiceFooterText,
		settings.WaInvoiceHeaderTitle, settings.WaInvoiceHeaderDescription, settings.WaInvoiceFooterText,
		settings.MapsEmbedUrl, settings.LogoURL, settings.FaviconURL,
		settings.CreatedAt, settings.UpdatedAt, orgID, settings.CreatedBy)
	if err != nil {
		return fmt.Errorf("failed to create clinic settings: %w", err)
	}
	return nil
}

func (r *Repository) Update(id string, settings *models.ClinicSettings, userByID string) error {
	_, err := r.db.Exec(`
		UPDATE clinic_settings
		SET clinic_name = $1, address = $2, phone = $3, email = $4, tax_rate = $5,
		    tax_inclusive = $6, low_stock_alerts = $7, appointment_reminders = $8,
		    expiry_warnings = $9, reminder_hours_before = $10,
		    whatsapp_reminder_enabled = $11, email_reminder_enabled = $12,
		    whatsapp_business_phone_id = $13, invoice_header_title = $14,
		    invoice_header_description = $15, invoice_footer_text = $16,
		    wa_invoice_header_title = $17, wa_invoice_header_description = $18, wa_invoice_footer_text = $19,
		    maps_embed_url = $20, logo_url = $21, favicon_url = $22,
		    updated_at = NOW(), updated_by = $23
		WHERE id = $24
	`, settings.ClinicName, settings.Address, settings.Phone, settings.Email,
		settings.TaxRate, settings.TaxInclusive, settings.LowStockAlerts,
		settings.AppointmentReminders, settings.ExpiryWarnings, settings.ReminderHoursBefore,
		settings.WhatsAppReminderEnabled, settings.EmailReminderEnabled,
		settings.WhatsAppBusinessPhoneID, settings.InvoiceHeaderTitle,
		settings.InvoiceHeaderDescription, settings.InvoiceFooterText,
		settings.WaInvoiceHeaderTitle, settings.WaInvoiceHeaderDescription, settings.WaInvoiceFooterText,
		settings.MapsEmbedUrl, settings.LogoURL, settings.FaviconURL,
		nullableString(userByID), id)
	if err != nil {
		return fmt.Errorf("failed to update clinic settings: %w", err)
	}
	return nil
}

// UpdateBrandAsset updates only the logo_url or favicon_url column for the
// given clinic settings row. Pass an empty url to clear the value.
func (r *Repository) UpdateBrandAsset(id, field, url string) error {
	if field != "logo_url" && field != "favicon_url" {
		return fmt.Errorf("invalid brand asset field: %s", field)
	}
	query := fmt.Sprintf(`
		UPDATE clinic_settings
		SET %s = $1, updated_at = NOW()
		WHERE id = $2
	`, field)
	_, err := r.db.Exec(query, nullableString(url), id)
	if err != nil {
		return fmt.Errorf("failed to update %s: %w", field, err)
	}
	return nil
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

type settingsScanner interface {
	Scan(dest ...interface{}) error
}

func scanClinicSettings(scanner settingsScanner) (models.ClinicSettings, error) {
	var settings models.ClinicSettings
	err := scanner.Scan(
		&settings.ID, &settings.ClinicName, &settings.Address, &settings.Phone,
		&settings.Email, &settings.TaxRate, &settings.TaxInclusive,
		&settings.LowStockAlerts, &settings.AppointmentReminders,
		&settings.ExpiryWarnings, &settings.ReminderHoursBefore,
		&settings.WhatsAppReminderEnabled, &settings.EmailReminderEnabled,
		&settings.WhatsAppBusinessPhoneID, &settings.InvoiceHeaderTitle,
		&settings.InvoiceHeaderDescription, &settings.InvoiceFooterText,
		&settings.WaInvoiceHeaderTitle, &settings.WaInvoiceHeaderDescription, &settings.WaInvoiceFooterText,
		&settings.MapsEmbedUrl, &settings.LogoURL, &settings.FaviconURL,
		&settings.CreatedAt, &settings.UpdatedAt,
	)
	if err != nil {
		return models.ClinicSettings{}, err
	}
	return settings, nil
}
