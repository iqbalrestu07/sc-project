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
	return NewHandler(NewService(nil, nil, nil))
}

// ImportExcel accepts an Excel file and migrates data based on `type`.
// type = "catalog" -> product/service/consumable
// type = "patient" -> patient
// POST /migration/import
func (h *Handler) ImportExcel(c *gin.Context) {
	orgID := c.GetString("org_id")
	if orgID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "X-Organization-ID header is required")
		return
	}
	userID := c.GetString("user_id")

	importType := c.PostForm("type")
	if importType == "" {
		importType = "catalog" // default for backward compatibility
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required (multipart/form-data, field 'file')")
		return
	}
	defer file.Close()

	var result *ImportResult
	if importType == "patient" {
		result, err = h.service.ImportPatientsExcel(file, header.Filename, orgID, userID)
	} else {
		result, err = h.service.ImportCatalogExcel(file, header.Filename, orgID, userID)
	}

	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusOK, "Migration completed", result)
}
