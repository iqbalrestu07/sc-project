package consumable

import "github.com/sc-pos/backend/internal/models"

// Service declares all business operations for the consumable (service_consumables) module.
type Service interface {
	ListByService(serviceID, orgID string) ([]ConsumableWithProduct, error)
	Upsert(c *models.ServiceConsumable, orgID, userID string) error
	Delete(id, orgID, userID string) error
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

func (s *service) ListByService(serviceID, orgID string) ([]ConsumableWithProduct, error) {
	return s.repo.ListByService(serviceID, orgID)
}

func (s *service) Upsert(c *models.ServiceConsumable, orgID, userID string) error {
	return s.repo.Upsert(c, orgID, userID)
}

func (s *service) Delete(id, orgID, userID string) error {
	return s.repo.Delete(id, orgID, userID)
}
