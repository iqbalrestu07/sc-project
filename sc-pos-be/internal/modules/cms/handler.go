package cms

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
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

func (h *Handler) ListPages(c *gin.Context) {
	orgID, ok := h.resolvePublicOrgID(c)
	if !ok {
		return
	}
	pageID := c.Query("page")
	if pageID != "" {
		page, err := h.service.GetPage(pageID, orgID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}
		utils.SuccessResponse(c, http.StatusOK, page)
		return
	}
	pages, err := h.service.ListPages(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, pages)
}

func (h *Handler) GetPage(c *gin.Context) {
	orgID, ok := h.resolvePublicOrgID(c)
	if !ok {
		return
	}
	page, err := h.service.GetPage(c.Param("pageId"), orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, page)
}

func (h *Handler) resolvePublicOrgID(c *gin.Context) (string, bool) {
	org, err := h.orgService.ResolvePublicOrganization(c.Query("org"))
	if errors.Is(err, orgModule.ErrOrgNotFound) {
		utils.ErrorResponse(c, http.StatusNotFound, "public organization not found")
		return "", false
	}
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return "", false
	}
	return org.ID, true
}

func (h *Handler) CreatePage(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	pageID, _ := req["page_id"].(string)
	if pageID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "page_id is required")
		return
	}
	delete(req, "page_id")
	page, err := h.service.UpsertPage(pageID, orgID, req, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "CMS page saved successfully", page)
}

func (h *Handler) UpdatePage(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	page, err := h.service.UpsertPage(c.Param("pageId"), orgID, req, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "CMS page updated successfully", page)
}

// UploadImage handles multipart file upload and saves via the configured
// Storage provider (local disk or Supabase S3). Returns the public URL.
func (h *Handler) UploadImage(c *gin.Context) {
	const maxSize = 10 << 20 // 10 MB
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

	// Seek back after sniffing
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	// Determine sub-folder within the storage root
	folder := "cms"
	userFolder := c.PostForm("folder")
	if userFolder != "" {
		cleanFolder, err := storage.SanitizeFolder(userFolder)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "invalid upload folder")
			return
		}
		folder = filepath.Join(folder, cleanFolder)
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	filename := storage.GenerateFilename(ext)

	publicURL, err := h.storage.Upload(c.Request.Context(), folder, filename, file, contentType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to save file")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, gin.H{"url": publicURL})
}
