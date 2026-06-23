package commission

import (
	"net/http"

	"github.com/gin-gonic/gin"
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

func (h *Handler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	roleStr, ok := role.(string)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "invalid role in token")
		return
	}

	idStr, ok := userID.(string)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "invalid user id in token")
		return
	}

	if roleStr != "admin" && roleStr != "doctor" && roleStr != "therapist" {
		utils.ErrorResponse(c, http.StatusForbidden, "insufficient permissions")
		return
	}

	commissions, err := h.service.List(orgID, roleStr, idStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, commissions)
}

func (h *Handler) ListByStaff(c *gin.Context) {
	orgID := c.GetString("org_id")
	commissions, err := h.service.ListByStaff(orgID, c.Param("staffId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, commissions)
}

func (h *Handler) UpdateStatus(c *gin.Context) {
	userID := c.GetString("user_id")
	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.UpdateStatus(req.IDs, req.Status, userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Commission status updated", nil)
}
