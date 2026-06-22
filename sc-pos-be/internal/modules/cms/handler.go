package cms

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
	pageID := c.Query("page")
	if pageID != "" {
		page, err := h.service.GetPage(pageID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}
		utils.SuccessResponse(c, http.StatusOK, page)
		return
	}
	pages, err := h.service.ListPages()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, pages)
}

func (h *Handler) GetPage(c *gin.Context) {
	page, err := h.service.GetPage(c.Param("pageId"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, page)
}

func (h *Handler) CreatePage(c *gin.Context) {
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
	page, err := h.service.UpsertPage(pageID, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "CMS page saved successfully", page)
}

func (h *Handler) UpdatePage(c *gin.Context) {
	var req interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	page, err := h.service.UpsertPage(c.Param("pageId"), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "CMS page updated successfully", page)
}

func (h *Handler) UploadImage(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusCreated, gin.H{"url": ""})
}
