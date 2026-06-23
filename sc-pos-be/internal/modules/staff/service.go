package staff

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("staff not found")

type Service struct {
	repo *Repository
}

func NewService(repo ...*Repository) *Service {
	if len(repo) > 0 {
		return &Service{repo: repo[0]}
	}
	return &Service{repo: NewRepository()}
}

func (s *Service) List(orgID string) ([]models.Staff, error) {
	return s.repo.List(orgID)
}

func (s *Service) Get(id, orgID string) (*models.Staff, error) {
	staff, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if staff == nil {
		return nil, ErrNotFound
	}
	return staff, nil
}

func (s *Service) Create(req models.Staff, orgID string) (*models.Staff, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) Update(id, orgID string, req models.Staff) (*models.Staff, error) {
	_, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
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
