package organization

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/middleware"
	"github.com/sc-pos/backend/internal/models"
)

var (
	ErrOrgNotFound      = errors.New("organization not found")
	ErrNotOrgMember     = errors.New("user is not a member of this organization")
	ErrInsufficientRole = errors.New("insufficient role for this action")
	ErrLastAdmin        = errors.New("cannot remove the last admin of an organization")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateOrg(name, description, createdBy string) (*models.Organization, error) {
	slug, err := s.repo.GenerateUniqueSlug(name)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	org := &models.Organization{
		ID:          uuid.New().String(),
		Name:        name,
		Slug:        slug,
		Description: description,
		IsActive:    true,
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(org); err != nil {
		return nil, err
	}

	// Creator is automatically an admin
	if err := s.repo.AddMember(org.ID, createdBy, middleware.RoleAdmin, createdBy); err != nil {
		return nil, err
	}

	return org, nil
}

func (s *Service) GetByID(id string) (*models.Organization, error) {
	org, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if org == nil {
		return nil, ErrOrgNotFound
	}
	return org, nil
}

func (s *Service) Update(org *models.Organization) error {
	existing, err := s.repo.GetByID(org.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrOrgNotFound
	}
	return s.repo.Update(org)
}

func (s *Service) Delete(orgID string) error {
	existing, err := s.repo.GetByID(orgID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrOrgNotFound
	}
	return s.repo.Delete(orgID)
}

func (s *Service) GetUserOrganizations(userID string) ([]models.OrganizationWithRole, error) {
	return s.repo.GetUserOrganizations(userID)
}

func (s *Service) ListMembers(orgID string) ([]models.OrganizationMember, error) {
	return s.repo.ListMembers(orgID)
}

func (s *Service) AddMember(orgID, userID, role, addedBy string) error {
	if !middleware.IsValidRole(role) {
		return errors.New("invalid role")
	}
	return s.repo.AddMember(orgID, userID, role, addedBy)
}

func (s *Service) UpdateMemberRole(orgID, userID, role string) error {
	if !middleware.IsValidRole(role) {
		return errors.New("invalid role")
	}
	return s.repo.UpdateMemberRole(orgID, userID, role)
}

func (s *Service) RemoveMember(orgID, userID string) error {
	return s.repo.RemoveMember(orgID, userID)
}
