package patient

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("patient not found")
var ErrSearchRequired = errors.New("search query required")

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(orgID string) ([]models.Patient, error) {
	return s.repo.GetAll(orgID)
}

func (s *Service) Get(id, orgID string) (*models.Patient, error) {
	patient, err := s.repo.GetByID(id, orgID)
	if err != nil {
		return nil, err
	}
	if patient == nil {
		return nil, ErrNotFound
	}

	return patient, nil
}

func (s *Service) Create(req models.Patient, userID, orgID string) (*models.Patient, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.PatientCode = "PAT-" + strings.ToUpper(uuid.New().String()[:8])
	req.IsActive = true
	req.CreatedBy = &userID
	req.CreatedAt = now
	req.UpdatedAt = now

	if req.Tags == nil {
		req.Tags = []string{}
	}

	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}

	return &req, nil
}

func (s *Service) Update(id string, req models.Patient, userID, orgID string) (*models.Patient, error) {
	patient, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}

	patient.FullName = req.FullName
	patient.PhotoURL = req.PhotoURL
	patient.DateOfBirth = req.DateOfBirth
	patient.Gender = req.Gender
	patient.Phone = req.Phone
	patient.WhatsApp = req.WhatsApp
	patient.Email = req.Email
	patient.Address = req.Address
	patient.AllergyHistory = req.AllergyHistory
	patient.MedicalConditions = req.MedicalConditions
	patient.SkinType = req.SkinType
	patient.Notes = req.Notes
	patient.Tags = req.Tags
	patient.UpdatedAt = time.Now()
	if userID != "" {
		patient.UpdatedBy = &userID
	}

	if patient.Tags == nil {
		patient.Tags = []string{}
	}

	if err := s.repo.Update(id, patient, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return patient, nil
}

func (s *Service) Delete(id, orgID, userID string) error {
	if err := s.repo.Delete(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	return nil
}

func (s *Service) GetVisits(patientID string) ([]VisitSummary, error) {
	return s.repo.GetVisits(patientID)
}

func (s *Service) GetTransactions(patientID string) ([]TransactionSummary, error) {
	return s.repo.GetTransactions(patientID)
}

func (s *Service) Search(query, orgID string) ([]models.Patient, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, ErrSearchRequired
	}

	return s.repo.Search(query, orgID)
}
