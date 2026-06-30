package stock

import "github.com/sc-pos/backend/internal/models"

// Service declares all business operations for the stock module.
type Service interface {
	List(params ListParams) ([]StockMovementWithRelations, error)
	Create(m *models.StockMovement, orgID string) error
}

type service struct {
	repo *Repository
}

// NewService constructs a Service backed by the provided Repository.
// If no repository is passed, a new one is created automatically.
func NewService(repo ...*Repository) Service {
	var r *Repository
	if len(repo) > 0 && repo[0] != nil {
		r = repo[0]
	} else {
		r = NewRepository()
	}
	return &service{repo: r}
}

func (s *service) List(params ListParams) ([]StockMovementWithRelations, error) {
	return s.repo.List(params)
}

func (s *service) Create(m *models.StockMovement, orgID string) error {
	return s.repo.Create(m, orgID)
}
