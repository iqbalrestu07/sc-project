package settings

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	orgModule "github.com/sc-pos/backend/internal/modules/organization"
	"github.com/sc-pos/backend/internal/storage"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service    Service
	orgService orgModule.Service
	storage    storage.Storage
}

func NewHandler(service Service, orgService orgModule.Service, store storage.Storage) *Handler {
	return &Handler{service: service, orgService: orgService, storage: store}
}

func NewModule(store storage.Storage) *Handler {
	return NewHandler(NewService(NewRepository()), orgModule.NewService(orgModule.NewRepository()), store)
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
// defaults to "logo"). The file is stored via the configured Storage provider
// and the resulting public URL is persisted on the clinic_settings row.
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

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".png"
	}
	filename := storage.GenerateFilename(ext)

	publicURL, err := h.storage.Upload(c.Request.Context(), "brand", filename, file, contentType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to save file")
		return
	}

	orgID := c.GetString("org_id")

	// Get current settings to check for existing asset URL (for cleanup)
	currentSettings, _ := h.service.GetClinic(orgID)
	var oldURL string
	if currentSettings != nil {
		switch field {
		case "logo_url":
			if currentSettings.LogoURL != nil {
				oldURL = *currentSettings.LogoURL
			}
		case "favicon_url":
			if currentSettings.FaviconURL != nil {
				oldURL = *currentSettings.FaviconURL
			}
		}
	}

	settings, err := h.service.UpdateBrandAsset(orgID, field, publicURL)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Delete old asset from storage (best-effort, don't fail the request)
	if oldURL != "" {
		_ = h.storage.DeleteByURL(c.Request.Context(), oldURL)
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

// SEORender intercepts Nginx SPA fallback to inject SSR meta tags for OpenGraph.
// It fetches index.html from FRONTEND_INTERNAL_URL, modifies <title> and <meta>
// based on the requested orgSlug in the path, and returns the raw HTML string.
func (h *Handler) SEORender(c *gin.Context) {
	reqPath := c.Query("path")

	// Default meta tags
	title := "Shasi Beauty Care"
	desc := "Selamat datang di Shasi Beauty Care."
	logo := "https://shasi-beauty.com/logo.png"

	// Parse orgSlug from path
	// Example paths: "/", "/klinik-budi", "/admin/login"
	parts := strings.Split(strings.Trim(reqPath, "/"), "/")
	orgSlug := ""
	if len(parts) > 0 && parts[0] != "" {
		// Ignore reserved routes that aren't org landing pages
		reserved := map[string]bool{
			"api": true, "uploads": true, "admin": true, "dashboard": true,
			"patients": true, "onboarding": true, "queue": true, "services": true,
			"products": true, "categories": true, "pos": true, "transactions": true,
			"commissions": true, "staff": true, "members": true, "messaging": true,
			"rbac": true, "cms": true, "settings": true, "stock-opname": true,
			"consumable-items": true, "import-excel": true, "reports": true,
		}
		if !reserved[parts[0]] {
			orgSlug = parts[0]
		}
	}

	// Resolve the organization (fallback to default if empty or not found)
	org, err := h.orgService.ResolvePublicOrganization(orgSlug)
	if err == nil {
		if s, err := h.service.GetClinicPublic(org.ID); err == nil && s != nil {
			if s.ClinicName != nil && *s.ClinicName != "" {
				title = *s.ClinicName
			}
			if s.Address != nil && *s.Address != "" {
				desc = *s.Address
			} else if s.ClinicName != nil {
				desc = "Selamat datang di " + *s.ClinicName
			}
			if s.LogoURL != nil && *s.LogoURL != "" {
				logo = *s.LogoURL
			}
		}
	}

	// Fetch index.html from Frontend

	frontendURL := os.Getenv("FRONTEND_INTERNAL_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // fallback
	}

	resp, err := http.Get(frontendURL + "/index.html")
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to load SPA template: "+err.Error())
		return
	}
	defer resp.Body.Close()

	htmlBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to read SPA template")
		return
	}
	html := string(htmlBytes)

	// Inject Meta Tags (Replace basic defaults found in index.html)
	// We replace <title>...</title>
	html = replaceRegex(html, `<title>.*?</title>`, fmt.Sprintf("<title>%s</title>", title))
	html = replaceRegex(html, `<meta name="description" content="[^"]*">`, fmt.Sprintf(`<meta name="description" content="%s">`, desc))

	// OpenGraph
	html = replaceRegex(html, `<meta property="og:title" content="[^"]*" />`, fmt.Sprintf(`<meta property="og:title" content="%s" />`, title))
	html = replaceRegex(html, `<meta property="og:description" content="[^"]*" />`, fmt.Sprintf(`<meta property="og:description" content="%s" />`, desc))
	html = replaceRegex(html, `<meta property="og:image" content="[^"]*" />`, fmt.Sprintf(`<meta property="og:image" content="%s" />`, logo))
	html = replaceRegex(html, `<meta property="og:image:alt" content="[^"]*" />`, fmt.Sprintf(`<meta property="og:image:alt" content="%s" />`, title))

	// Twitter
	html = replaceRegex(html, `<meta name="twitter:title" content="[^"]*" />`, fmt.Sprintf(`<meta name="twitter:title" content="%s" />`, title))
	html = replaceRegex(html, `<meta name="twitter:description" content="[^"]*" />`, fmt.Sprintf(`<meta name="twitter:description" content="%s" />`, desc))
	html = replaceRegex(html, `<meta name="twitter:image" content="[^"]*" />`, fmt.Sprintf(`<meta name="twitter:image" content="%s" />`, logo))
	html = replaceRegex(html, `<meta name="twitter:image:alt" content="[^"]*" />`, fmt.Sprintf(`<meta name="twitter:image:alt" content="%s" />`, title))

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

func replaceRegex(html, pattern, replacement string) string {

	re := regexp.MustCompile(pattern)
	if re.MatchString(html) {
		return re.ReplaceAllString(html, replacement)
	}
	return html
}
