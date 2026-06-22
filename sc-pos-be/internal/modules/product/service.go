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

func (s *Service) List() ([]models.Product, error) {
	return s.repo.List()
}

func (s *Service) Get(id string) (*models.Product, error) {
	product, err := s.repo.Get(id)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, ErrNotFound
	}
	return product, nil
}

func (s *Service) Create(req models.Product) (*models.Product, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.CreatedAt = now
	req.UpdatedAt = now
	req.IsActive = true
	applyProductDefaults(&req)
	if err := s.repo.Create(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) Update(id string, req models.Product) (*models.Product, error) {
	_, err := s.Get(id)
	if err != nil {
		return nil, err
	}
	applyProductDefaults(&req)
	if err := s.repo.Update(id, &req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.Get(id)
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

func (s *Service) ListCategories() ([]models.ProductCategory, error) {
	return s.repo.ListCategories()
}

func (s *Service) CreateCategory(req models.ProductCategory) (*models.ProductCategory, error) {
	now := time.Now()
	req.ID = uuid.New().String()
	req.IsActive = true
	req.CreatedAt = now
	req.UpdatedAt = now
	if err := s.repo.CreateCategory(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) UpdateCategory(id string, req models.ProductCategory) (*models.ProductCategory, error) {
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

func applyProductDefaults(product *models.Product) {
	if product.MinimumStock == 0 {
		product.MinimumStock = 5
	}
	if product.Unit == nil {
		unit := "pcs"
		product.Unit = &unit
	}
}
