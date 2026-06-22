package authmodule

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	backendauth "github.com/sc-pos/backend/internal/auth"
	"github.com/sc-pos/backend/internal/models"
)

var ErrInvalidCredentials = errors.New("invalid email or password")
var ErrEmailAlreadyUsed = errors.New("email already registered")

type Service struct {
	repo *Repository
}

type AuthPayload struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         models.User `json:"user"`
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Login(email, password string) (*AuthPayload, error) {
	user, err := s.repo.GetByEmail(strings.TrimSpace(strings.ToLower(email)))
	if err != nil {
		return nil, err
	}
	if user == nil || !backendauth.VerifyPassword(user.Password, password) {
		return nil, ErrInvalidCredentials
	}

	return s.issueTokens(*user)
}

func (s *Service) Register(email, password, role string) (*AuthPayload, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if role == "" {
		role = "cashier"
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

	return s.issueTokens(user)
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

	return s.issueTokens(user)
}

func (s *Service) issueTokens(user models.User) (*AuthPayload, error) {
	accessToken, err := backendauth.GenerateToken(user.ID, user.Email, user.Role, 24)
	if err != nil {
		return nil, err
	}

	refreshToken, err := backendauth.GenerateToken(user.ID, user.Email, user.Role, 24*7)
	if err != nil {
		return nil, err
	}

	user.Password = ""
	return &AuthPayload{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}
