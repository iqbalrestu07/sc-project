package patient

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

var ErrNotFound = errors.New("patient not found")
var ErrSearchRequired = errors.New("search query required")

// Service is the public interface for the patient module business logic.
type Service interface {
	ListAll(orgID string) ([]models.Patient, error)
	List(orgID, search string, page, limit int, whatsappOnly bool) ([]models.Patient, bool, int, error)
	Get(id, orgID string) (*models.Patient, error)
	Create(req models.Patient, userID, orgID string) (*models.Patient, error)
	Update(id string, req models.Patient, userID, orgID string) (*models.Patient, error)
	Upsert(req models.Patient, userID, orgID string) (bool, error)
	UpsertTx(tx *sql.Tx, req models.Patient, userID, orgID string) (bool, error)
	BatchUpsertTx(tx *sql.Tx, reqs []models.Patient, userID, orgID string) (int, int, error)
	Delete(id, orgID, userID string) error
	GetVisits(patientID string) ([]VisitSummary, error)
	GetTransactions(patientID string) ([]TransactionSummary, error)
}

type service struct {
	repo *Repository
}

func NewService(repo *Repository) Service {
	return &service{repo: repo}
}

func (s *service) ListAll(orgID string) ([]models.Patient, error) {
	return s.repo.GetAll(orgID)
}

func (s *service) List(orgID, search string, page, limit int, whatsappOnly bool) ([]models.Patient, bool, int, error) {
	search = strings.TrimSpace(search)
	return s.repo.List(orgID, search, page, limit, whatsappOnly)
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
	req.ID = utils.NewUUID()
	req.PatientCode = "PAT-" + strings.ToUpper(utils.NewUUID()[:8])
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

// Upsert inserts a new patient or updates an existing one using ON CONFLICT.
// Match key: (organization_id, LOWER(full_name), COALESCE(phone, ”)).
// Returns (true, nil) if a new patient was created, (false, nil) if updated.
func (s *service) Upsert(req models.Patient, userID, orgID string) (bool, error) {
	now := time.Now()
	req.ID = utils.NewUUID()
	req.PatientCode = "PAT-" + strings.ToUpper(utils.NewUUID()[:8])
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	req.CreatedAt = now
	req.UpdatedAt = now

	if req.Tags == nil {
		req.Tags = []string{}
	}

	return s.repo.Upsert(&req, orgID, userID)
}

// UpsertTx is like Upsert but runs within an existing transaction.
// Used by bulk import to wrap all upserts in 1 transaction (1 WAL fsync at COMMIT).
func (s *service) UpsertTx(tx *sql.Tx, req models.Patient, userID, orgID string) (bool, error) {
	now := time.Now()
	req.ID = utils.NewUUID()
	req.PatientCode = "PAT-" + strings.ToUpper(utils.NewUUID()[:8])
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	req.CreatedAt = now
	req.UpdatedAt = now

	if req.Tags == nil {
		req.Tags = []string{}
	}

	return s.repo.UpsertTx(tx, &req, orgID, userID)
}

// BatchUpsertTx inserts/updates multiple patients in a single query.
// Returns (createdCount, updatedCount, error).
func (s *service) BatchUpsertTx(tx *sql.Tx, reqs []models.Patient, userID, orgID string) (int, int, error) {
	now := time.Now()
	ptrs := make([]*models.Patient, 0, len(reqs))
	for i := range reqs {
		reqs[i].ID = utils.NewUUID()
		reqs[i].PatientCode = "PAT-" + strings.ToUpper(utils.NewUUID()[:8])
		reqs[i].IsActive = true
		if userID != "" {
			reqs[i].CreatedBy = &userID
		}
		reqs[i].CreatedAt = now
		reqs[i].UpdatedAt = now
		if reqs[i].Tags == nil {
			reqs[i].Tags = []string{}
		}
		ptrs = append(ptrs, &reqs[i])
	}
	return s.repo.BatchUpsertTx(tx, ptrs, orgID, userID)
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

// Search is handled by List now
