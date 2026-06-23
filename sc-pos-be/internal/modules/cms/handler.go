package cms

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

func (h *Handler) ListPages(c *gin.Context) {
	orgID := c.GetString("org_id")
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
	orgID := c.GetString("org_id")
	page, err := h.service.GetPage(c.Param("pageId"), orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, page)
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

// UploadImage handles multipart file upload and saves to ./uploads/cms/ directory.
// Returns the public URL of the uploaded file.
func (h *Handler) UploadImage(c *gin.Context) {
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

	// Seek back after sniffing
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	// Determine upload directory — use UPLOAD_DIR env or default to ./uploads/cms
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "uploads/cms"
	}
	folder := c.PostForm("folder")
	if folder != "" {
		uploadDir = filepath.Join(uploadDir, filepath.Clean(folder))
	}

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to create upload directory")
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), uuid.New().String()[:8], ext)
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

	// Build public URL
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		scheme := "http"
		baseURL = fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	}
	publicURL := fmt.Sprintf("%s/%s/%s", strings.TrimRight(baseURL, "/"), uploadDir, filename)

	utils.SuccessResponse(c, http.StatusCreated, gin.H{"url": publicURL})
}
