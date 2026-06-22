package transaction

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
	transactions, err := h.service.List()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, transactions)
}

func (h *Handler) Get(c *gin.Context) {
	transaction, err := h.service.Get(c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, transaction)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	transaction, err := h.service.Create(req, getUserID(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Transaction created successfully", transaction)
}

func (h *Handler) Update(c *gin.Context) {
	var req models.Transaction
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	transaction, err := h.service.Update(c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Transaction updated successfully", transaction)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Transaction deleted successfully", nil)
}

func (h *Handler) Items(c *gin.Context) {
	items, err := h.service.Items(c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, items)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}
	utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
}

func getUserID(c *gin.Context) *string {
	value, ok := c.Get("user_id")
	if !ok {
		return nil
	}
	userID, ok := value.(string)
	if !ok || userID == "" {
		return nil
	}
	return &userID
}
