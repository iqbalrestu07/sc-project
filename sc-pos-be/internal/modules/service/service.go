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

type Service struct {
	repo *Repository
}

func NewService(repo ...*Repository) *Service {
	if len(repo) > 0 {
		return &Service{repo: repo[0]}
	}
	return &Service{repo: NewRepository()}
}

func (s *Service) List(search, orgID string) ([]models.Service, error) {
	return s.repo.List(strings.TrimSpace(search), orgID)
}

func (s *Service) Get(id, orgID string) (*models.Service, error) {
	service, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if service == nil {
		return nil, ErrNotFound
	}
	return service, nil
}

func (s *Service) Create(req models.Service, orgID string) (*models.Service, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	applyServiceDefaults(&req)
	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) Update(id string, req models.Service, orgID string) (*models.Service, error) {
	_, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	applyServiceDefaults(&req)
	if err := s.repo.Update(id, &req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.Get(id, orgID)
}

func (s *Service) Delete(id string) error {
	if err := s.repo.Delete(id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (s *Service) ListCategories(orgID string) ([]models.ServiceCategory, error) {
	return s.repo.ListCategories(orgID)
}

func (s *Service) CreateCategory(req models.ServiceCategory, orgID string) (*models.ServiceCategory, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	if err := s.repo.CreateCategory(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) UpdateCategory(id string, req models.ServiceCategory) (*models.ServiceCategory, error) {
	req.UpdatedAt = time.Now()
	if err := s.repo.UpdateCategory(id, &req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	req.ID = id
	return &req, nil
}

func (s *Service) DeleteCategory(id string) error {
	if err := s.repo.DeleteCategory(id); err != nil {
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
