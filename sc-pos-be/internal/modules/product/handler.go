package product

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
	products, err := h.service.List()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, products)
}

func (h *Handler) Get(c *gin.Context) {
	product, err := h.service.Get(c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, product)
}

func (h *Handler) Create(c *gin.Context) {
	var req models.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	product, err := h.service.Create(req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Product created successfully", product)
}

func (h *Handler) Update(c *gin.Context) {
	var req models.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	product, err := h.service.Update(c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Product updated successfully", product)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Product deleted successfully", nil)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}
	utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
}
