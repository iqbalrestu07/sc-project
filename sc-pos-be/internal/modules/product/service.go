package product

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("product not found")

type Service struct {
	repo *Repository
}

func NewService(repo ...*Repository) *Service {
	if len(repo) > 0 {
		return &Service{repo: repo[0]}
	}
	return &Service{repo: NewRepository()}
}

func (s *Service) List(orgID string) ([]models.Product, error) {
	return s.repo.List(orgID)
}

func (s *Service) Get(id, orgID string) (*models.Product, error) {
	product, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, ErrNotFound
	}
	return product, nil
}

func (s *Service) Create(req models.Product, orgID, userID string) (*models.Product, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	applyProductDefaults(&req)
	if err := s.repo.Create(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) Update(id string, req models.Product, orgID, userID string) (*models.Product, error) {
	_, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	applyProductDefaults(&req)
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

func (s *Service) Delete(id, orgID, userID string) error {
	if err := s.repo.Delete(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (s *Service) ListCategories(orgID string) ([]models.ProductCategory, error) {
	return s.repo.ListCategories(orgID)
}

func (s *Service) CreateCategory(req models.ProductCategory, orgID, userID string) (*models.ProductCategory, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.IsActive = true
	req.CreatedAt = now
	req.UpdatedAt = now
	if userID != "" {
		req.CreatedBy = &userID
	}
	if err := s.repo.CreateCategory(&req, orgID); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) UpdateCategory(id string, req models.ProductCategory, orgID, userID string) (*models.ProductCategory, error) {
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

func (s *Service) DeleteCategory(id, orgID, userID string) error {
	if err := s.repo.DeleteCategory(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func applyProductDefaults(product *models.Product) {
	if product.MinimumStock == 0 {
		product.MinimumStock = 5
	}
	if product.Unit == nil {
		unit := "pcs"
		product.Unit = &unit
	}
}
