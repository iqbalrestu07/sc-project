package settings

import (
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

// Service is the public interface for the settings module business logic.
type Service interface {
	GetClinic(orgID string) (*models.ClinicSettings, error)
	GetClinicPublic() (*models.ClinicSettings, error)
	UpdateClinic(req models.ClinicSettings, orgID, userByID string) (*models.ClinicSettings, error)
}

type service struct {
	repo *Repository
}

func NewService(repo ...*Repository) Service {
	if len(repo) > 0 {
		return &service{repo: repo[0]}
	}
	return &service{repo: NewRepository()}
}

func (s *service) GetClinic(orgID string) (*models.ClinicSettings, error) {
	settings, err := s.repo.GetClinic(orgID)
	if err != nil {
		return nil, err
	}
	if settings != nil {
		return settings, nil
	}
	defaults := defaultClinicSettings()
	if err := s.repo.Create(defaults, orgID); err != nil {
		return nil, err
	}
	return defaults, nil
}

// GetClinicPublic returns the first clinic settings without org filtering
// and without auto-creating a default row.
// Use this for public/unauthenticated endpoints (e.g. landing page).
func (s *service) GetClinicPublic() (*models.ClinicSettings, error) {
	return s.repo.GetFirstClinic()
}

func (s *service) UpdateClinic(req models.ClinicSettings, orgID, userByID string) (*models.ClinicSettings, error) {
	current, err := s.GetClinic(orgID)
	if err != nil {
		return nil, err
	}
	mergeClinicSettings(current, req)
	if err := s.repo.Update(current.ID, current, userByID); err != nil {
		return nil, err
	}
	return s.GetClinic(orgID)
}

func defaultClinicSettings() *models.ClinicSettings {
	now := time.Now()
	clinicName := "Shasi Clinic"
	taxRate := 0.0
	taxInclusive := false
	enabled := true
	reminderHours := 24
	return &models.ClinicSettings{
		ID:                      uuid.New().String(),
		ClinicName:              &clinicName,
		TaxRate:                 &taxRate,
		TaxInclusive:            &taxInclusive,
		LowStockAlerts:          &enabled,
		AppointmentReminders:    &enabled,
		ExpiryWarnings:          &enabled,
		ReminderHoursBefore:     &reminderHours,
		WhatsAppReminderEnabled: &enabled,
		EmailReminderEnabled:    &enabled,
		CreatedAt:               now,
		UpdatedAt:               now,
	}
}

func mergeClinicSettings(current *models.ClinicSettings, req models.ClinicSettings) {
	current.ClinicName = req.ClinicName
	current.Address = req.Address
	current.Phone = req.Phone
	current.Email = req.Email
	current.TaxRate = req.TaxRate
	current.TaxInclusive = req.TaxInclusive
	current.LowStockAlerts = req.LowStockAlerts
	current.AppointmentReminders = req.AppointmentReminders
	current.ExpiryWarnings = req.ExpiryWarnings
	current.ReminderHoursBefore = req.ReminderHoursBefore
	current.WhatsAppReminderEnabled = req.WhatsAppReminderEnabled
	current.EmailReminderEnabled = req.EmailReminderEnabled
	current.WhatsAppBusinessPhoneID = req.WhatsAppBusinessPhoneID
	current.InvoiceHeaderTitle = req.InvoiceHeaderTitle
	current.InvoiceHeaderDescription = req.InvoiceHeaderDescription
	current.InvoiceFooterText = req.InvoiceFooterText
	current.MapsEmbedUrl = req.MapsEmbedUrl
}
