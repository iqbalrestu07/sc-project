package organization

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func NewModule() *Handler {
	return NewHandler(NewService(NewRepository()))
}

// ── Org CRUD ─────────────────────────────────────────────────────────────────

func (h *Handler) CreateOrg(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	org, err := h.service.CreateOrg(req.Name, req.Description, userID.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, org)
}

func (h *Handler) GetOrg(c *gin.Context) {
	orgID := c.Param("id")
	org, err := h.service.GetByID(orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, org)
}

func (h *Handler) UpdateOrg(c *gin.Context) {
	orgID := c.Param("id")
	userID := c.GetString("user_id")
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		LogoURL     string `json:"logo_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	org := &models.Organization{
		ID:          orgID,
		Name:        req.Name,
		Description: req.Description,
		LogoURL:     req.LogoURL,
	}
	if err := h.service.Update(org, userID); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "organization updated", nil)
}

func (h *Handler) DeleteOrg(c *gin.Context) {
	orgID := c.Param("id")
	userID := c.GetString("user_id")
	if err := h.service.Delete(orgID, userID); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "organization deleted", nil)
}

func (h *Handler) MyOrganizations(c *gin.Context) {
	userID, _ := c.Get("user_id")
	orgs, err := h.service.GetUserOrganizations(userID.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if orgs == nil {
		orgs = []models.OrganizationWithRole{}
	}
	utils.SuccessResponse(c, http.StatusOK, orgs)
}

// ── Members ──────────────────────────────────────────────────────────────────

func (h *Handler) ListMembers(c *gin.Context) {
	orgID := c.Param("id")
	members, err := h.service.ListMembers(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if members == nil {
		members = []models.OrganizationMember{}
	}
	utils.SuccessResponse(c, http.StatusOK, members)
}

func (h *Handler) AddMember(c *gin.Context) {
	orgID := c.Param("id")
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Role   string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	addedBy, _ := c.Get("user_id")
	if err := h.service.AddMember(orgID, req.UserID, req.Role, addedBy.(string)); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "member added", nil)
}

func (h *Handler) UpdateMemberRole(c *gin.Context) {
	orgID := c.Param("id")
	memberUserID := c.Param("userId")
	callerUserID := c.GetString("user_id")
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.UpdateMemberRole(orgID, memberUserID, req.Role, callerUserID); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "member role updated", nil)
}

func (h *Handler) RemoveMember(c *gin.Context) {
	orgID := c.Param("id")
	memberUserID := c.Param("userId")
	callerUserID := c.GetString("user_id")
	if err := h.service.RemoveMember(orgID, memberUserID, callerUserID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "member removed", nil)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrOrgNotFound):
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrNotOrgMember):
		utils.ErrorResponse(c, http.StatusForbidden, err.Error())
	default:
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
}
