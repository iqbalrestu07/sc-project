package product

import (
	"database/sql"
	"errors"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("product not found")

// Service is the public contract for product business logic.
type Service interface {
	List(orgID string) ([]models.Product, error)
	Get(id, orgID string) (*models.Product, error)
	GetByName(name, orgID string) (*models.Product, error)
	Create(req models.Product, orgID, userID string) (*models.Product, error)
	Update(id string, req models.Product, orgID, userID string) (*models.Product, error)
	UpsertByName(req models.Product, orgID, userID string) (*models.Product, error)
	Delete(id, orgID, userID string) error
	ListCategories(orgID string) ([]models.ProductCategory, error)
	CreateCategory(req models.ProductCategory, orgID, userID string) (*models.ProductCategory, error)
	UpdateCategory(id string, req models.ProductCategory, orgID, userID string) (*models.ProductCategory, error)
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

func (s *service) List(orgID string) ([]models.Product, error) {
	return s.repo.List(orgID)
}

func (s *service) Get(id, orgID string) (*models.Product, error) {
	product, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if product == nil {
		return nil, ErrNotFound
	}
	return product, nil
}

func (s *service) GetByName(name, orgID string) (*models.Product, error) {
	return s.repo.GetByName(name, orgID)
}

func (s *service) Create(req models.Product, orgID, userID string) (*models.Product, error) {
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

func (s *service) Update(id string, req models.Product, orgID, userID string) (*models.Product, error) {
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

func (s *service) UpsertByName(req models.Product, orgID, userID string) (*models.Product, error) {
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

func (s *service) ListCategories(orgID string) ([]models.ProductCategory, error) {
	return s.repo.ListCategories(orgID)
}

func (s *service) CreateCategory(req models.ProductCategory, orgID, userID string) (*models.ProductCategory, error) {
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

func (s *service) UpdateCategory(id string, req models.ProductCategory, orgID, userID string) (*models.ProductCategory, error) {
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

func applyProductDefaults(product *models.Product) {
	if product.MinimumStock == 0 {
		product.MinimumStock = 5
	}
	if product.Unit == nil {
		unit := "pcs"
		product.Unit = &unit
	}
	if product.Sku == nil {
		sku := genSkuCode()
		product.Sku = &sku
	}
}

func genSkuCode() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	suffix := make([]byte, 4)
	for i := range suffix {
		suffix[i] = chars[rand.Intn(len(chars))]
	}
	return "SKU-" + time.Now().Format("20060102150405") + "-" + string(suffix)
}
