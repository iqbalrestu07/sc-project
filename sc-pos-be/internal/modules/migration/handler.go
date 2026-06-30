package migration

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func NewModule() *Handler {
	return NewHandler(NewService(nil, nil))
}

// ImportExcel accepts an Excel file and migrates product/service/consumable data.
// Expected columns: nama, jenis, harga, komisi.
// POST /migration/import
func (h *Handler) ImportExcel(c *gin.Context) {
	orgID := c.GetString("org_id")
	if orgID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "X-Organization-ID header is required")
		return
	}
	userID := c.GetString("user_id")

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required (multipart/form-data, field 'file')")
		return
	}
	defer file.Close()

	result, err := h.service.ImportExcel(file, orgID, userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusOK, "Migration completed", result)
}
