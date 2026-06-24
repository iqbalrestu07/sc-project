package authmodule

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/modules/organization"
	"github.com/sc-pos/backend/internal/modules/rbac"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service *Service
	orgRepo *organization.Repository
	rbacSvc *rbac.Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
		orgRepo: organization.NewRepository(),
		rbacSvc: rbac.NewService(rbac.NewRepository()),
	}
}

func NewModule() *Handler {
	return NewHandler(NewService(NewRepository()))
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		h.handleError(c, err)
		return
	}

	authResponse(c, http.StatusOK, payload)
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.Register(req.Email, req.Password, req.OrganizationName, req.FullName)
	if err != nil {
		h.handleError(c, err)
		return
	}

	authResponse(c, http.StatusCreated, payload)
}

// AdminRegister hanya bisa diakses admin — membuat user dengan role tertentu.
func (h *Handler) AdminRegister(c *gin.Context) {
	var req AdminRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.AdminRegister(req.Email, req.Password, req.Role)
	if err != nil {
		h.handleError(c, err)
		return
	}

	// Auto-add newly created user to admin's current org
	orgID, hasOrg := c.Get("org_id")
	if hasOrg && orgID != "" {
		_ = h.orgRepo.AddMember(orgID.(string), payload.User.ID, req.Role, "")
	}

	authResponse(c, http.StatusCreated, payload)
}

func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.Refresh(req.RefreshToken)
	if err != nil {
		h.handleError(c, err)
		return
	}

	authResponse(c, http.StatusOK, payload)
}

func (h *Handler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")
	email, _ := c.Get("email")
	role, _ := c.Get("role")
	orgID, _ := c.Get("org_id")
	orgRole, _ := c.Get("org_role")

	response := gin.H{
		"id":    userID,
		"email": email,
		"role":  role,
	}

	if orgID != nil && orgID != "" {
		response["org_id"] = orgID
		response["org_role"] = orgRole

		// Fetch effective permissions for this user in this org
		if perms, err := h.rbacSvc.GetEffectivePermissions(
			userID.(string), orgID.(string), orgRole.(string),
		); err == nil {
			response["permissions"] = perms
		}
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

func (h *Handler) Logout(c *gin.Context) {
	utils.SuccessResponseWithMessage(c, http.StatusOK, "logged out successfully", nil)
}

// SearchUserByEmail looks up an existing user by email. Admin-only.
func (h *Handler) SearchUserByEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "email query parameter is required")
		return
	}

	user, err := h.service.FindUserByEmail(email)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if user == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "user not found")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, user)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidCredentials):
		utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrEmailAlreadyUsed):
		utils.ErrorResponse(c, http.StatusConflict, err.Error())
	case errors.Is(err, ErrInvalidRole):
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
	default:
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
}

func authResponse(c *gin.Context, statusCode int, payload *AuthPayload) {
	c.JSON(statusCode, gin.H{
		"success":          true,
		"access_token":     payload.AccessToken,
		"refresh_token":    payload.RefreshToken,
		"user":             payload.User,
		"organizations":    payload.Organizations,
		"needs_onboarding": payload.NeedsOnboarding,
	})
}
