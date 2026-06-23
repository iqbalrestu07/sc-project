package rbac

import (
	"errors"

	"github.com/sc-pos/backend/internal/middleware"
	"github.com/sc-pos/backend/internal/models"
)

var ErrInvalidPermission = errors.New("invalid permission ID")

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListAllPermissions() ([]models.Permission, error) {
	return s.repo.ListAllPermissions()
}

func (s *Service) GetAllRolePermissions() (map[string][]string, error) {
	return s.repo.GetAllRolePermissions()
}

func (s *Service) GetRolePermissions(role string) ([]string, error) {
	if !middleware.IsValidRole(role) {
		return nil, errors.New("invalid role")
	}
	return s.repo.GetRolePermissions(role)
}

func (s *Service) SetRolePermissions(role string, permissionIDs []string) error {
	if !middleware.IsValidRole(role) {
		return errors.New("invalid role")
	}
	return s.repo.SetRolePermissions(role, permissionIDs)
}

func (s *Service) GetUserExtraPermissions(userID, orgID string) ([]models.UserPermission, error) {
	return s.repo.GetUserExtraPermissions(userID, orgID)
}

func (s *Service) GrantUserPermission(userID, orgID, permissionID, grantedBy string) error {
	return s.repo.GrantUserPermission(userID, orgID, permissionID, grantedBy)
}

func (s *Service) RevokeUserPermission(userID, orgID, permissionID string) error {
	return s.repo.RevokeUserPermission(userID, orgID, permissionID)
}

func (s *Service) GetEffectivePermissions(userID, orgID, role string) ([]string, error) {
	return s.repo.GetEffectivePermissions(userID, orgID, role)
}
