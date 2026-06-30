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

// Service is the public interface for the patient module business logic.
type Service interface {
	List(orgID string) ([]models.Patient, error)
	Get(id, orgID string) (*models.Patient, error)
	Create(req models.Patient, userID, orgID string) (*models.Patient, error)
	Update(id string, req models.Patient, userID, orgID string) (*models.Patient, error)
	Delete(id, orgID, userID string) error
	Search(query, orgID string) ([]models.Patient, error)
	GetVisits(patientID string) ([]VisitSummary, error)
	GetTransactions(patientID string) ([]TransactionSummary, error)
}

type service struct {
	repo *Repository
}

func NewService(repo *Repository) Service {
	return &service{repo: repo}
}

func (s *service) List(orgID string) ([]models.Patient, error) {
	return s.repo.GetAll(orgID)
}

func (s *service) Get(id, orgID string) (*models.Patient, error) {
	patient, err := s.repo.GetByID(id, orgID)
	if err != nil {
		return nil, err
	}
	if patient == nil {
		return nil, ErrNotFound
	}

	return patient, nil
}

func (s *service) Create(req models.Patient, userID, orgID string) (*models.Patient, error) {
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

func (s *service) Update(id string, req models.Patient, userID, orgID string) (*models.Patient, error) {
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

func (s *service) Delete(id, orgID, userID string) error {
	if err := s.repo.Delete(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	return nil
}

func (s *service) GetVisits(patientID string) ([]VisitSummary, error) {
	return s.repo.GetVisits(patientID)
}

func (s *service) GetTransactions(patientID string) ([]TransactionSummary, error) {
	return s.repo.GetTransactions(patientID)
}

func (s *service) Search(query, orgID string) ([]models.Patient, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, ErrSearchRequired
	}

	return s.repo.Search(query, orgID)
}
