package service

import (
	"errors"
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

func (h *Handler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	services, err := h.service.List(c.Query("search"), orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, services)
}

func (h *Handler) Get(c *gin.Context) {
	orgID := c.GetString("org_id")
	service, err := h.service.Get(c.Param("id"), orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, service)
}

func (h *Handler) Create(c *gin.Context) {
	var req models.Service
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	orgID := c.GetString("org_id")
	service, err := h.service.Create(req, orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Service created successfully", service)
}

func (h *Handler) Update(c *gin.Context) {
	var req models.Service
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	orgID := c.GetString("org_id")
	service, err := h.service.Update(c.Param("id"), req, orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Service updated successfully", service)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Service deleted successfully", nil)
}

func (h *Handler) ListCategories(c *gin.Context) {
	orgID := c.GetString("org_id")
	categories, err := h.service.ListCategories(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, categories)
}

func (h *Handler) CreateCategory(c *gin.Context) {
	var req models.ServiceCategory
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	orgID := c.GetString("org_id")
	category, err := h.service.CreateCategory(req, orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Service category created successfully", category)
}

func (h *Handler) UpdateCategory(c *gin.Context) {
	var req models.ServiceCategory
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	category, err := h.service.UpdateCategory(c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Service category updated successfully", category)
}

func (h *Handler) DeleteCategory(c *gin.Context) {
	if err := h.service.DeleteCategory(c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Service category deleted successfully", nil)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}
	utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
}
