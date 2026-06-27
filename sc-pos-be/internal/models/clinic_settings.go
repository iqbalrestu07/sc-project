package models

import "time"

// ClinicSettings represents clinic configuration
type ClinicSettings struct {
	ID                       string     `json:"id" db:"id"`
	ClinicName               *string    `json:"clinic_name" db:"clinic_name"`
	Address                  *string    `json:"address" db:"address"`
	Phone                    *string    `json:"phone" db:"phone"`
	Email                    *string    `json:"email" db:"email"`
	TaxRate                  *float64   `json:"tax_rate" db:"tax_rate"`
	TaxInclusive             *bool      `json:"tax_inclusive" db:"tax_inclusive"`
	LowStockAlerts           *bool      `json:"low_stock_alerts" db:"low_stock_alerts"`
	AppointmentReminders     *bool      `json:"appointment_reminders" db:"appointment_reminders"`
	ExpiryWarnings           *bool      `json:"expiry_warnings" db:"expiry_warnings"`
	ReminderHoursBefore      *int       `json:"reminder_hours_before" db:"reminder_hours_before"`
	WhatsAppReminderEnabled  *bool      `json:"whatsapp_reminder_enabled" db:"whatsapp_reminder_enabled"`
	EmailReminderEnabled     *bool      `json:"email_reminder_enabled" db:"email_reminder_enabled"`
	WhatsAppBusinessPhoneID  *string    `json:"whatsapp_business_phone_id" db:"whatsapp_business_phone_id"`
	InvoiceHeaderTitle       *string    `json:"invoice_header_title" db:"invoice_header_title"`
	InvoiceHeaderDescription *string    `json:"invoice_header_description" db:"invoice_header_description"`
	InvoiceFooterText        *string    `json:"invoice_footer_text" db:"invoice_footer_text"`
	MapsEmbedUrl             *string    `json:"maps_embed_url" db:"maps_embed_url"`
	CreatedBy                *string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy                *string    `json:"updated_by,omitempty" db:"updated_by"`
	DeletedAt                *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
	CreatedAt                time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at" db:"updated_at"`
}
