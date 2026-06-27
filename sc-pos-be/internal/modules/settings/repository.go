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
		       invoice_header_description, invoice_footer_text, maps_embed_url,
		       created_at, updated_at
		FROM clinic_settings
		WHERE (organization_id = $1 OR ($1::text = '' AND organization_id IS NULL))
		  AND deleted_at IS NULL
		ORDER BY created_at ASC
		LIMIT 1
	`, orgID)
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
			invoice_footer_text, maps_embed_url, created_at, updated_at, organization_id, created_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
	`, settings.ID, settings.ClinicName, settings.Address, settings.Phone, settings.Email,
		settings.TaxRate, settings.TaxInclusive, settings.LowStockAlerts,
		settings.AppointmentReminders, settings.ExpiryWarnings, settings.ReminderHoursBefore,
		settings.WhatsAppReminderEnabled, settings.EmailReminderEnabled,
		settings.WhatsAppBusinessPhoneID, settings.InvoiceHeaderTitle,
		settings.InvoiceHeaderDescription, settings.InvoiceFooterText, settings.MapsEmbedUrl,
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
		    maps_embed_url = $17,
		    updated_at = NOW(), updated_by = $18
		WHERE id = $19
	`, settings.ClinicName, settings.Address, settings.Phone, settings.Email,
		settings.TaxRate, settings.TaxInclusive, settings.LowStockAlerts,
		settings.AppointmentReminders, settings.ExpiryWarnings, settings.ReminderHoursBefore,
		settings.WhatsAppReminderEnabled, settings.EmailReminderEnabled,
		settings.WhatsAppBusinessPhoneID, settings.InvoiceHeaderTitle,
		settings.InvoiceHeaderDescription, settings.InvoiceFooterText, settings.MapsEmbedUrl,
		nullableString(userByID), id)
	if err != nil {
		return fmt.Errorf("failed to update clinic settings: %w", err)
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
		&settings.InvoiceHeaderDescription, &settings.InvoiceFooterText, &settings.MapsEmbedUrl,
		&settings.CreatedAt, &settings.UpdatedAt,
	)
	if err != nil {
		return models.ClinicSettings{}, err
	}
	return settings, nil
}
