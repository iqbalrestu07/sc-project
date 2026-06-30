package rbac

import (
	"errors"

	"github.com/sc-pos/backend/internal/middleware"
	"github.com/sc-pos/backend/internal/models"
)

var ErrInvalidPermission = errors.New("invalid permission ID")

// Service is the public contract for RBAC business logic.
type Service interface {
	ListAllPermissions() ([]models.Permission, error)
	GetAllRolePermissions() (map[string][]string, error)
	GetRolePermissions(role string) ([]string, error)
	SetRolePermissions(role string, permissionIDs []string) error
	GetUserExtraPermissions(userID, orgID string) ([]models.UserPermission, error)
	GrantUserPermission(userID, orgID, permissionID, grantedBy string) error
	RevokeUserPermission(userID, orgID, permissionID string) error
	GetEffectivePermissions(userID, orgID, role string) ([]string, error)
}

type service struct {
	repo *Repository
}

func NewService(repo *Repository) Service {
	return &service{repo: repo}
}

func (s *service) ListAllPermissions() ([]models.Permission, error) {
	return s.repo.ListAllPermissions()
}

func (s *service) GetAllRolePermissions() (map[string][]string, error) {
	return s.repo.GetAllRolePermissions()
}

func (s *service) GetRolePermissions(role string) ([]string, error) {
	if !middleware.IsValidRole(role) {
		return nil, errors.New("invalid role")
	}
	return s.repo.GetRolePermissions(role)
}

func (s *service) SetRolePermissions(role string, permissionIDs []string) error {
	if !middleware.IsValidRole(role) {
		return errors.New("invalid role")
	}
	return s.repo.SetRolePermissions(role, permissionIDs)
}

func (s *service) GetUserExtraPermissions(userID, orgID string) ([]models.UserPermission, error) {
	return s.repo.GetUserExtraPermissions(userID, orgID)
}

func (s *service) GrantUserPermission(userID, orgID, permissionID, grantedBy string) error {
	return s.repo.GrantUserPermission(userID, orgID, permissionID, grantedBy)
}

func (s *service) RevokeUserPermission(userID, orgID, permissionID string) error {
	return s.repo.RevokeUserPermission(userID, orgID, permissionID)
}

func (s *service) GetEffectivePermissions(userID, orgID, role string) ([]string, error) {
	return s.repo.GetEffectivePermissions(userID, orgID, role)
}
