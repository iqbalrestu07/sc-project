package transaction

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func NewModule() *Handler {
	return NewHandler(NewService(NewRepository()))
}

func (h *Handler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	
	page := utils.ParseIntQuery(c, "page", 1)
	limit := utils.ParseIntQuery(c, "limit", 50)

	transactions, hasNext, err := h.service.List(orgID, page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.ListSuccessResponse(c, transactions, hasNext, page, limit)
}

func (h *Handler) Get(c *gin.Context) {
	orgID := c.GetString("org_id")
	transaction, err := h.service.Get(c.Param("id"), orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, transaction)
}

func (h *Handler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	transaction, err := h.service.Create(req, getUserID(c), orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Transaction created successfully", transaction)
}

type UpdateTransactionRequest struct {
	models.Transaction
	SendWhatsApp *bool `json:"send_whatsapp"`
}

func (h *Handler) Update(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	var req UpdateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	transaction, err := h.service.Update(c.Param("id"), orgID, userID, req.Transaction, req.SendWhatsApp)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Transaction updated successfully", transaction)
}

func (h *Handler) Delete(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	if err := h.service.Delete(c.Param("id"), orgID, userID); err != nil {
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
