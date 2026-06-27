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
	userID := c.GetString("user_id")
	var req models.ClinicSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	settings, err := h.service.UpdateClinic(req, orgID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Clinic settings updated successfully", settings)
}

func (h *Handler) UploadLogo(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusCreated, gin.H{"url": ""})
}

// PublicClinicInfo returns a safe subset of clinic settings for public pages
// (landing page etc.) — no authentication required.
// It reads directly from the repository to avoid the auto-create side-effect
// that GetClinic() triggers when no row exists yet.
func (h *Handler) PublicClinicInfo(c *gin.Context) {
	s, err := h.service.GetClinicPublic()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if s == nil {
		// No settings configured yet — return empty object so frontend handles gracefully.
		utils.SuccessResponse(c, http.StatusOK, gin.H{
			"clinic_name":    nil,
			"address":        nil,
			"phone":          nil,
			"email":          nil,
			"maps_embed_url": nil,
		})
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"clinic_name":    s.ClinicName,
		"address":        s.Address,
		"phone":          s.Phone,
		"email":          s.Email,
		"maps_embed_url": s.MapsEmbedUrl,
	})
}
