package appointment

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

var ErrNotFound = errors.New("appointment not found")

// Service is the public interface for the appointment module business logic.
type Service interface {
	List(orgID string, start, end *time.Time) ([]AppointmentWithRelations, error)
	Get(id, orgID string) (*AppointmentWithRelations, error)
	Create(req models.Appointment, userID *string, orgID string) (*AppointmentWithRelations, error)
	Update(id, orgID, userID string, req models.Appointment) (*AppointmentWithRelations, error)
	Delete(id, orgID, userID string) error
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

func (s *service) List(orgID string, start, end *time.Time) ([]AppointmentWithRelations, error) {
	return s.repo.List(orgID, start, end)
}

func (s *service) Get(id, orgID string) (*AppointmentWithRelations, error) {
	appointment, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if appointment == nil {
		return nil, ErrNotFound
	}
	return appointment, nil
}

func (s *service) Create(req models.Appointment, userID *string, orgID string) (*AppointmentWithRelations, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedBy = userID
	req.CreatedAt = now
	req.UpdatedAt = now
	if req.Status == "" {
		req.Status = "scheduled"
	}
	// Treat all appointment times as Asia/Jakarta wall-clock before storing.
	req.ScheduledAt = utils.ToJakarta(req.ScheduledAt)
	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}
	return s.Get(req.ID, orgID)
}

func (s *service) Update(id, orgID, userID string, req models.Appointment) (*AppointmentWithRelations, error) {
	current, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if req.PatientID == "" {
		req.PatientID = current.PatientID
	}
	if req.ServiceID == "" {
		req.ServiceID = current.ServiceID
	}
	if req.ScheduledAt.IsZero() {
		req.ScheduledAt = current.ScheduledAt
	} else {
		req.ScheduledAt = utils.ToJakarta(req.ScheduledAt)
	}
	if req.Status == "" {
		req.Status = current.Status
	}
	if req.DoctorID == nil {
		req.DoctorID = current.DoctorID
	}
	if req.TherapistID == nil {
		req.TherapistID = current.TherapistID
	}
	if req.DurationMinutes == nil {
		req.DurationMinutes = current.DurationMinutes
	}
	if req.Notes == nil {
		req.Notes = current.Notes
	}
	if userID != "" {
		req.UpdatedBy = &userID
	}
	if err := s.repo.Update(id, &req, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.Get(id, orgID)
}

func (s *service) Delete(id, orgID, userID string) error {
	if err := s.repo.Delete(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}
