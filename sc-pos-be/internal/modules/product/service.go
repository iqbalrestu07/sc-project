package product

import (
	"database/sql"
	"errors"
	"math/rand"
	"time"

	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

var ErrNotFound = errors.New("product not found")

// Service is the public contract for product business logic.
type Service interface {
	List(orgID, search string, page, limit int) ([]models.Product, bool, error)
	Get(id, orgID string) (*models.Product, error)
	GetByName(name, orgID string) (*models.Product, error)
	GetByNames(names []string, orgID string) (map[string]*models.Product, error)
	Create(req models.Product, orgID, userID string) (*models.Product, error)
	Update(id string, req models.Product, orgID, userID string) (*models.Product, error)
	Upsert(req models.Product, orgID, userID string) (bool, error)
	UpsertTx(tx *sql.Tx, req models.Product, orgID, userID string) (bool, error)
	BatchUpsertTx(tx *sql.Tx, reqs []models.Product, orgID, userID string) (int, int, error)
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

func (s *service) List(orgID, search string, page, limit int) ([]models.Product, bool, error) {
	return s.repo.List(orgID, search, page, limit)
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

func (s *service) GetByNames(names []string, orgID string) (map[string]*models.Product, error) {
	return s.repo.GetByNames(names, orgID)
}

func (s *service) Create(req models.Product, orgID, userID string) (*models.Product, error) {
	now := time.Now()
	req.ID = utils.NewUUID()
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

// Upsert inserts or updates a product using ON CONFLICT on (org_id, LOWER(name)).
// Returns (true, nil) if created, (false, nil) if updated.
func (s *service) Upsert(req models.Product, orgID, userID string) (bool, error) {
	now := time.Now()
	req.ID = utils.NewUUID()
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	req.CreatedAt = now
	req.UpdatedAt = now
	applyProductDefaults(&req)
	return s.repo.Upsert(&req, orgID, userID)
}

// UpsertTx is like Upsert but runs within an existing transaction.
func (s *service) UpsertTx(tx *sql.Tx, req models.Product, orgID, userID string) (bool, error) {
	now := time.Now()
	req.ID = utils.NewUUID()
	req.IsActive = true
	if userID != "" {
		req.CreatedBy = &userID
	}
	req.CreatedAt = now
	req.UpdatedAt = now
	applyProductDefaults(&req)
	return s.repo.UpsertTx(tx, &req, orgID, userID)
}

// BatchUpsertTx inserts/updates multiple products in a single query.
// Returns (createdCount, updatedCount, error).
func (s *service) BatchUpsertTx(tx *sql.Tx, reqs []models.Product, orgID, userID string) (int, int, error) {
	now := time.Now()
	ptrs := make([]*models.Product, 0, len(reqs))
	for i := range reqs {
		reqs[i].ID = utils.NewUUID()
		reqs[i].IsActive = true
		if userID != "" {
			reqs[i].CreatedBy = &userID
		}
		reqs[i].CreatedAt = now
		reqs[i].UpdatedAt = now
		applyProductDefaults(&reqs[i])
		ptrs = append(ptrs, &reqs[i])
	}
	return s.repo.BatchUpsertTx(tx, ptrs, orgID, userID)
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
	req.ID = utils.NewUUID()
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
