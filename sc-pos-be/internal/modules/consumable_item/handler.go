package consumable_item

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

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

// ListProducts godoc
// GET /consumable-items
// Returns all products with is_consumable=true for the org.
func (h *Handler) ListProducts(c *gin.Context) {
	orgID := c.GetString("org_id")
	products, err := h.service.ListConsumableProducts(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, products)
}

// ListUsageLogs godoc
// GET /consumable-items/usage
// Supports ?product_id=&purpose=&from=YYYY-MM-DD&to=YYYY-MM-DD
func (h *Handler) ListUsageLogs(c *gin.Context) {
	orgID := c.GetString("org_id")

	params := ListParams{
		ProductID:    c.Query("product_id"),
		UsagePurpose: c.Query("purpose"),
		OrgID:        orgID,
	}

	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			params.From = &t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			end := t.Add(24*time.Hour - time.Second)
			params.To = &end
		}
	}

	logs, err := h.service.ListUsageLogs(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, logs)
}

// CreateUsageLog godoc
// POST /consumable-items/usage
// Records consumable usage, deducts stock atomically, and mirrors to stock_movements.
func (h *Handler) CreateUsageLog(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	var req models.ConsumableUsageLog
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ProductID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "product_id is required")
		return
	}
	if req.Quantity <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "quantity must be greater than 0")
		return
	}
	validPurposes := map[string]bool{
		"treatment": true, "appointment": true,
		"waste": true, "internal": true, "other": true,
	}
	if !validPurposes[req.UsagePurpose] {
		utils.ErrorResponse(c, http.StatusBadRequest, "usage_purpose must be one of: treatment, appointment, waste, internal, other")
		return
	}

	if userID != "" {
		req.CreatedBy = &userID
	}

	if err := h.service.CreateUsageLog(&req, orgID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Usage log recorded successfully", req)
}

// MarkConsumable godoc
// PUT /products/:id/mark-consumable
// Toggles the is_consumable flag and optionally sets the consumable_category.
func (h *Handler) MarkConsumable(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	productID := c.Param("id")

	var req struct {
		IsConsumable       bool    `json:"is_consumable"`
		ConsumableCategory *string `json:"consumable_category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.MarkConsumable(productID, orgID, userID, req.IsConsumable, req.ConsumableCategory); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.ErrorResponse(c, http.StatusNotFound, "product not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Product consumable flag updated", nil)
}
