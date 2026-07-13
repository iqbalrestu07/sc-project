package service

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("service not found")

// Service is the public interface for the service module business logic.
type Service interface {
	List(search, orgID string, page, limit int) ([]models.Service, bool, error)
	Get(id, orgID string) (*models.Service, error)
	GetByName(name, orgID string) (*models.Service, error)
	Create(req models.Service, orgID, userID string) (*models.Service, error)
	Update(id string, req models.Service, orgID, userID string) (*models.Service, error)
	UpsertByName(req models.Service, orgID, userID string) (*models.Service, error)
	Delete(id, orgID, userID string) error
	ListCategories(orgID string) ([]models.ServiceCategory, error)
	CreateCategory(req models.ServiceCategory, orgID, userID string) (*models.ServiceCategory, error)
	UpdateCategory(id string, req models.ServiceCategory, orgID, userID string) (*models.ServiceCategory, error)
	DeleteCategory(id, orgID, userID string) error
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

func (s *service) List(search, orgID string, page, limit int) ([]models.Service, bool, error) {
	return s.repo.List(strings.TrimSpace(search), orgID, page, limit)
}

func (s *service) Get(id, orgID string) (*models.Service, error) {
	service, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if service == nil {
		return nil, ErrNotFound
	}
	return service, nil
}

func (s *service) GetByName(name, orgID string) (*models.Service, error) {
	return s.repo.GetByName(name, orgID)
}

func (s *service) Create(req models.Service, orgID, userID string) (*models.Service, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	applyServiceDefaults(&req)
	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *service) Update(id string, req models.Service, orgID, userID string) (*models.Service, error) {
	_, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	applyServiceDefaults(&req)
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

func (s *service) UpsertByName(req models.Service, orgID, userID string) (*models.Service, error) {
	existing, err := s.GetByName(req.Name, orgID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		req.ID = existing.ID
		req.CreatedAt = existing.CreatedAt
		if userID != "" {
			req.CreatedBy = existing.CreatedBy
		}
		return s.Update(existing.ID, req, orgID, userID)
	}
	return s.Create(req, orgID, userID)
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

func (s *service) ListCategories(orgID string) ([]models.ServiceCategory, error) {
	return s.repo.ListCategories(orgID)
}

func (s *service) CreateCategory(req models.ServiceCategory, orgID, userID string) (*models.ServiceCategory, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	if err := s.repo.CreateCategory(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *service) UpdateCategory(id string, req models.ServiceCategory, orgID, userID string) (*models.ServiceCategory, error) {
	req.UpdatedAt = time.Now()
	if userID != "" {
		req.UpdatedBy = &userID
	}
	if err := s.repo.UpdateCategory(id, &req, orgID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	req.ID = id
	return &req, nil
}

func (s *service) DeleteCategory(id, orgID, userID string) error {
	if err := s.repo.DeleteCategory(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func applyServiceDefaults(service *models.Service) {
	if service.DurationMinutes == 0 {
		service.DurationMinutes = 30
	}
	if service.DoctorCommissionType == "" {
		service.DoctorCommissionType = "fixed"
	}
	if service.TherapistCommissionType == "" {
		service.TherapistCommissionType = "fixed"
	}
}
