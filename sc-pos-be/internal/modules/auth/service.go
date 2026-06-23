package authmodule

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	backendauth "github.com/sc-pos/backend/internal/auth"
	"github.com/sc-pos/backend/internal/middleware"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/organization"
)

var ErrInvalidCredentials = errors.New("invalid email or password")
var ErrEmailAlreadyUsed = errors.New("email already registered")
var ErrInvalidRole = errors.New("invalid role: must be admin, doctor, therapist, or cashier")

type Service struct {
	repo    *Repository
	orgRepo *organization.Repository
}

type AuthPayload struct {
	AccessToken     string                        `json:"access_token"`
	RefreshToken    string                        `json:"refresh_token"`
	User            models.User                   `json:"user"`
	Organizations   []models.OrganizationWithRole `json:"organizations"`
	NeedsOnboarding bool                          `json:"needs_onboarding"`
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo:    repo,
		orgRepo: organization.NewRepository(),
	}
}

func (s *Service) Login(email, password string) (*AuthPayload, error) {
	user, err := s.repo.GetByEmail(strings.TrimSpace(strings.ToLower(email)))
	if err != nil {
		return nil, err
	}
	if user == nil || !backendauth.VerifyPassword(user.Password, password) {
		return nil, ErrInvalidCredentials
	}

	orgs, err := s.orgRepo.GetUserOrganizations(user.ID)
	if err != nil {
		return nil, err
	}

	return s.issueTokens(*user, orgs)
}

// Register: public onboarding — creates user + first organization in one atomic operation.
// The user becomes the admin of the newly created organization.
func (s *Service) Register(email, password, orgName, fullName string) (*AuthPayload, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	existing, err := s.repo.GetByEmail(email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailAlreadyUsed
	}

	hashedPassword, err := backendauth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := models.User{
		ID:        uuid.New().String(),
		Email:     email,
		Password:  hashedPassword,
		Role:      middleware.RoleAdmin, // first user of new org is always admin
		FullName:  fullName,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(&user); err != nil {
		return nil, err
	}

	// Create the organization and add user as admin
	orgSvc := organization.NewService(s.orgRepo)
	orgModel, err := orgSvc.CreateOrg(orgName, "", user.ID)
	if err != nil {
		return nil, err
	}

	org := models.OrganizationWithRole{
		Organization: *orgModel,
		Role:         middleware.RoleAdmin,
	}

	user.Password = ""
	return &AuthPayload{
		AccessToken:     generateAccessToken(user),
		RefreshToken:    generateRefreshToken(user),
		User:            user,
		Organizations:   []models.OrganizationWithRole{org},
		NeedsOnboarding: false,
	}, nil
}

// AdminRegister: admin invites a user to the current org with a specific role.
// Called within org context (org_id from context).
func (s *Service) AdminRegister(email, password, role string) (*AuthPayload, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	role = strings.TrimSpace(strings.ToLower(role))

	if !middleware.IsValidRole(role) {
		return nil, ErrInvalidRole
	}

	existing, err := s.repo.GetByEmail(email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailAlreadyUsed
	}

	hashedPassword, err := backendauth.HashPassword(password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := models.User{
		ID:        uuid.New().String(),
		Email:     email,
		Password:  hashedPassword,
		Role:      role,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(&user); err != nil {
		return nil, err
	}

	return s.issueTokens(user, nil)
}

func (s *Service) Refresh(refreshToken string) (*AuthPayload, error) {
	claims, err := backendauth.VerifyToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	user := models.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  claims.Role,
	}

	orgs, err := s.orgRepo.GetUserOrganizations(user.ID)
	if err != nil {
		orgs = nil
	}

	return s.issueTokens(user, orgs)
}

func (s *Service) issueTokens(user models.User, orgs []models.OrganizationWithRole) (*AuthPayload, error) {
	accessToken, err := backendauth.GenerateToken(user.ID, user.Email, user.Role, 24)
	if err != nil {
		return nil, err
	}

	refreshToken, err := backendauth.GenerateToken(user.ID, user.Email, user.Role, 24*7)
	if err != nil {
		return nil, err
	}

	if orgs == nil {
		orgs = []models.OrganizationWithRole{}
	}

	user.Password = ""
	return &AuthPayload{
		AccessToken:     accessToken,
		RefreshToken:    refreshToken,
		User:            user,
		Organizations:   orgs,
		NeedsOnboarding: len(orgs) == 0,
	}, nil
}

func generateAccessToken(user models.User) string {
	token, _ := backendauth.GenerateToken(user.ID, user.Email, user.Role, 24)
	return token
}

func generateRefreshToken(user models.User) string {
	token, _ := backendauth.GenerateToken(user.ID, user.Email, user.Role, 24*7)
	return token
}
