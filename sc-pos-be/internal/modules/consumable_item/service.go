package consumable_item

import "github.com/sc-pos/backend/internal/models"

// Service declares all business operations for the consumable_item module.
type Service interface {
	ListConsumableProducts(orgID string) ([]models.Product, error)
	ListUsageLogs(params ListParams) ([]ConsumableUsageLogWithProduct, error)
	CreateUsageLog(log *models.ConsumableUsageLog, orgID string) error
	MarkConsumable(productID, orgID, userID string, isConsumable bool, category *string) error
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

func (s *service) ListConsumableProducts(orgID string) ([]models.Product, error) {
	return s.repo.ListConsumableProducts(orgID)
}

func (s *service) ListUsageLogs(params ListParams) ([]ConsumableUsageLogWithProduct, error) {
	return s.repo.ListUsageLogs(params)
}

func (s *service) CreateUsageLog(log *models.ConsumableUsageLog, orgID string) error {
	return s.repo.CreateUsageLog(log, orgID)
}

func (s *service) MarkConsumable(productID, orgID, userID string, isConsumable bool, category *string) error {
	return s.repo.MarkConsumable(productID, orgID, userID, isConsumable, category)
}
