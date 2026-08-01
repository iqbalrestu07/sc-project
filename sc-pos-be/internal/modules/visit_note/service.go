package visit_note

import (
	"errors"
	"time"

	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

var ErrNotFound = errors.New("visit note not found")

type Service interface {
	Create(req models.VisitNote, userID, orgID string) (*models.VisitNote, error)
	Get(id, orgID string) (*models.VisitNote, error)
	ListByPatient(patientID, orgID string) ([]models.VisitNoteWithDetails, error)
	Update(id string, req models.VisitNote, userID, orgID string) (*models.VisitNote, error)
	Delete(id, orgID, userID string) error
}

type service struct {
	repo *Repository
}

func NewService(repo *Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(req models.VisitNote, userID, orgID string) (*models.VisitNote, error) {
	now := time.Now()
	req.ID = utils.NewUUID()
	req.OrganizationID = orgID
	req.CreatedBy = &userID
	req.UpdatedAt = now
	req.CreatedAt = now
	if req.VisitDate.IsZero() {
		req.VisitDate = now
	}

	if err := s.repo.Create(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *service) Get(id, orgID string) (*models.VisitNote, error) {
	note, err := s.repo.GetByID(id, orgID)
	if err != nil {
		return nil, ErrNotFound
	}
	return note, nil
}

func (s *service) ListByPatient(patientID, orgID string) ([]models.VisitNoteWithDetails, error) {
	return s.repo.ListByPatient(patientID, orgID)
}

func (s *service) Update(id string, req models.VisitNote, userID, orgID string) (*models.VisitNote, error) {
	req.OrganizationID = orgID
	req.UpdatedBy = &userID
	if err := s.repo.Update(id, &req); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id, orgID)
}

func (s *service) Delete(id, orgID, userID string) error {
	return s.repo.Delete(id, orgID, userID)
}
