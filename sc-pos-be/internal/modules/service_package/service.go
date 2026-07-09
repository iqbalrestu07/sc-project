package service_package

import "github.com/sc-pos/backend/internal/models"

// Service declares all business operations for the service consumable groups module.
type Service interface {
	ListGroups(serviceID, orgID string) ([]models.ServiceConsumableGroup, error)
	CreateGroup(g *models.ServiceConsumableGroup, orgID, userID string) error
	UpdateGroup(id, name string, qty float64, orgID, userID string) error
	DeleteGroup(id, orgID, userID string) error
	AddGroupItem(it *models.ServiceConsumableGroupItem, orgID, userID string) error
	DeleteGroupItem(id, orgID, userID string) error
}

type serviceImpl struct {
	repo *Repository
}

// NewService constructs a Service backed by the provided Repository.
func NewService(repo *Repository) Service {
	return &serviceImpl{repo: repo}
}

func (s *serviceImpl) ListGroups(serviceID, orgID string) ([]models.ServiceConsumableGroup, error) {
	return s.repo.ListGroups(serviceID, orgID)
}

func (s *serviceImpl) CreateGroup(g *models.ServiceConsumableGroup, orgID, userID string) error {
	return s.repo.CreateGroup(g, orgID, userID)
}

func (s *serviceImpl) UpdateGroup(id, name string, qty float64, orgID, userID string) error {
	return s.repo.UpdateGroup(id, name, qty, orgID, userID)
}

func (s *serviceImpl) DeleteGroup(id, orgID, userID string) error {
	return s.repo.DeleteGroup(id, orgID, userID)
}

func (s *serviceImpl) AddGroupItem(it *models.ServiceConsumableGroupItem, orgID, userID string) error {
	return s.repo.AddGroupItem(it, orgID, userID)
}

func (s *serviceImpl) DeleteGroupItem(id, orgID, userID string) error {
	return s.repo.DeleteGroupItem(id, orgID, userID)
}
