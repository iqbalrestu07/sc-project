package staff

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("staff not found")

// Service is the public contract for staff business logic.
type Service interface {
	List(orgID string) ([]models.Staff, error)
	Get(id, orgID string) (*models.Staff, error)
	GetByUserID(userID string) (*models.Staff, error)
	Create(req models.Staff, userID, orgID string) (*models.Staff, error)
	Update(id, orgID, userID string, req models.Staff) (*models.Staff, error)
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

func (s *service) List(orgID string) ([]models.Staff, error) {
	return s.repo.List(orgID)
}

func (s *service) Get(id, orgID string) (*models.Staff, error) {
	staff, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if staff == nil {
		return nil, ErrNotFound
	}
	return staff, nil
}

func (s *service) GetByUserID(userID string) (*models.Staff, error) {
	return s.repo.GetByUserID(userID)
}

func (s *service) Create(req models.Staff, userID, orgID string) (*models.Staff, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *service) Update(id, orgID, userID string, req models.Staff) (*models.Staff, error) {
	_, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
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
