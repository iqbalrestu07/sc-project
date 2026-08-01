package appointment

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/transaction"
	"github.com/sc-pos/backend/internal/utils"
)

var ErrNotFound = errors.New("appointment not found")

// ErrTransactionPaid is returned when an appointment cannot be cancelled
// because its linked transaction has already been paid.
var ErrTransactionPaid = errors.New("cannot cancel appointment: linked transaction is already paid")

// Service is the public interface for the appointment module business logic.
type Service interface {
	List(orgID string, start, end *time.Time) ([]AppointmentWithRelations, error)
	ListAll(orgID string, start, end *time.Time) ([]AppointmentWithRelations, error)
	Get(id, orgID string) (*AppointmentWithRelations, error)
	Create(req models.Appointment, userID *string, orgID string) (*AppointmentWithRelations, error)
	Update(id, orgID, userID string, req models.Appointment) (*AppointmentWithRelations, error)
	UpdateStatus(id, status, orgID, userID string) (*AppointmentWithRelations, error)
	Delete(id, orgID, userID string) error
	Cancel(id, orgID, userID string) (*AppointmentWithRelations, error)
	GetServicesByAppointment(appointmentID string) ([]string, error)
}

type service struct {
	repo   *Repository
	txRepo *transaction.Repository
}

func NewService(repo ...*Repository) Service {
	if len(repo) > 0 {
		return &service{repo: repo[0], txRepo: transaction.NewRepository()}
	}
	return &service{repo: NewRepository(), txRepo: transaction.NewRepository()}
}

func (s *service) List(orgID string, start, end *time.Time) ([]AppointmentWithRelations, error) {
	return s.repo.List(orgID, start, end)
}

func (s *service) ListAll(orgID string, start, end *time.Time) ([]AppointmentWithRelations, error) {
	return s.repo.ListAll(orgID, start, end)
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
	req.ID = utils.NewUUID()
	req.CreatedBy = userID
	req.CreatedAt = now
	req.UpdatedAt = now
	if req.Status == "" {
		req.Status = "scheduled"
	}
	if req.Source == "" {
		req.Source = "appointment"
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

// Cancel cancels an appointment and its linked draft transaction (if any).
// If the linked transaction is already paid/partial/refunded, the cancellation
// is refused with ErrTransactionPaid — paid sales must be preserved.
func (s *service) Cancel(id, orgID, userID string) (*AppointmentWithRelations, error) {
	// Verify the appointment exists and belongs to the org.
	current, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	// Already cancelled — idempotent no-op.
	if current.Status == "cancelled" {
		return current, nil
	}

	// Cancel linked draft transaction (if any).
	cancelledTxID, blocked, err := s.txRepo.CancelByAppointment(id, orgID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel linked transaction: %w", err)
	}
	if blocked {
		return nil, ErrTransactionPaid
	}
	_ = cancelledTxID // transaction was cancelled (or none existed)

	// Soft-delete + set status = cancelled on the appointment.
	if err := s.repo.Delete(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.Get(id, orgID)
}

func (s *service) GetServicesByAppointment(appointmentID string) ([]string, error) {
	return s.repo.GetServicesByAppointment(appointmentID)
}

// UpdateStatus updates only the status field of an appointment.
// Used by the queue page to move patients between antrian → dilayani → selesai.
func (s *service) UpdateStatus(id, status, orgID, userID string) (*AppointmentWithRelations, error) {
	if err := s.repo.UpdateStatus(id, status, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.Get(id, orgID)
}
