package settings

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	orgModule "github.com/sc-pos/backend/internal/modules/organization"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service    Service
	orgService orgModule.Service
}

func NewHandler(service Service, orgService orgModule.Service) *Handler {
	return &Handler{service: service, orgService: orgService}
}

func NewModule() *Handler {
	return NewHandler(NewService(NewRepository()), orgModule.NewService(orgModule.NewRepository()))
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

// UploadLogo handles multipart upload for the organization's logo OR favicon.
// The asset kind is selected via the `type` form field ("logo" or "favicon";
// defaults to "logo"). The uploaded file is stored under ./uploads/brand/ and
// the resulting public URL is persisted on the clinic_settings row.
func (h *Handler) UploadLogo(c *gin.Context) {
	const maxSize = 5 << 20 // 5 MB
	if err := c.Request.ParseMultipartForm(maxSize); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file field is required")
		return
	}
	defer file.Close()

	// Validate MIME type
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	if !strings.HasPrefix(contentType, "image/") {
		utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("invalid file type: %s", contentType))
		return
	}
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	// Determine asset kind → DB column
	assetType := strings.ToLower(strings.TrimSpace(c.PostForm("type")))
	if assetType == "" {
		assetType = "logo"
	}
	var field string
	switch assetType {
	case "logo":
		field = "logo_url"
	case "favicon":
		field = "favicon_url"
	default:
		utils.ErrorResponse(c, http.StatusBadRequest, "type must be 'logo' or 'favicon'")
		return
	}

	uploadDir := "uploads/brand"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to create upload directory")
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".png"
	}
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), utils.NewUUID()[:8], ext)
	dest := filepath.Join(uploadDir, filename)

	out, err := os.Create(dest)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, file); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to write file")
		return
	}

	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		scheme := "http"
		if c.Request.TLS != nil {
			scheme = "https"
		}
		baseURL = fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	}
	publicURL := fmt.Sprintf("%s/%s/%s", strings.TrimRight(baseURL, "/"), uploadDir, filename)

	orgID := c.GetString("org_id")
	settings, err := h.service.UpdateBrandAsset(orgID, field, publicURL)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusCreated,
		fmt.Sprintf("%s uploaded successfully", assetType),
		gin.H{"url": publicURL, "settings": settings},
	)
}

// PublicClinicInfo returns a safe subset of clinic settings for public pages
// (landing page etc.) — no authentication required.
// It reads directly from the repository to avoid the auto-create side-effect
// that GetClinic() triggers when no row exists yet.
func (h *Handler) PublicClinicInfo(c *gin.Context) {
	org, err := h.orgService.ResolvePublicOrganization(c.Query("org"))
	if errors.Is(err, orgModule.ErrOrgNotFound) {
		utils.ErrorResponse(c, http.StatusNotFound, "public organization not found")
		return
	}
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	s, err := h.service.GetClinicPublic(org.ID)
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
			"logo_url":       nil,
			"favicon_url":    nil,
		})
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"clinic_name":    s.ClinicName,
		"address":        s.Address,
		"phone":          s.Phone,
		"email":          s.Email,
		"maps_embed_url": s.MapsEmbedUrl,
		"logo_url":       s.LogoURL,
		"favicon_url":    s.FaviconURL,
	})
}
