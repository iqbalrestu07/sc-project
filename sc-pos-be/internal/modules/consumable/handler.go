package consumable

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	repo *Repository
}

func NewModule() *Handler {
	return &Handler{repo: NewRepository()}
}

func (h *Handler) ListByService(c *gin.Context) {
	orgID := c.GetString("org_id")
	serviceID := c.Query("service_id")
	items, err := h.repo.ListByService(serviceID, orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, items)
}

func (h *Handler) Upsert(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req models.ServiceConsumable
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ServiceID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "service_id is required")
		return
	}
	if err := h.repo.Upsert(&req, orgID, userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable saved", req)
}

func (h *Handler) Delete(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	if err := h.repo.Delete(c.Param("id"), orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.ErrorResponse(c, http.StatusNotFound, "consumable not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable deleted", nil)
}
