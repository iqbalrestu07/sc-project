package settings

import (
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

func (h *Handler) GetClinic(c *gin.Context) {
	orgID := c.GetString("org_id")
	settings, err := h.service.GetClinic(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, settings)
}

func (h *Handler) UpdateClinic(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req models.ClinicSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	settings, err := h.service.UpdateClinic(req, orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Clinic settings updated successfully", settings)
}

func (h *Handler) UploadLogo(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusCreated, gin.H{"url": ""})
}
