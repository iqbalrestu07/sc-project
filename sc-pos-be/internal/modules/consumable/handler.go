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
	items, err := h.repo.ListByService(c.Param("serviceId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, items)
}

func (h *Handler) Upsert(c *gin.Context) {
	var req models.ServiceConsumable
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	req.ServiceID = c.Param("serviceId")
	if err := h.repo.Upsert(&req); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable saved", req)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.repo.Delete(c.Param("id")); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.ErrorResponse(c, http.StatusNotFound, "consumable not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable deleted", nil)
}
