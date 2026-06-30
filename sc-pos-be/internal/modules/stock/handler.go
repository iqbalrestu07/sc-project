package stock

import (
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

func (h *Handler) List(c *gin.Context) {
	orgID := c.GetString("org_id")

	params := ListParams{
		ProductID:     c.Query("product_id"),
		ReferenceType: c.Query("reference_type"), // "manual" | "transaction" | ""
		OrgID:         orgID,
	}

	// Optional date range — accept YYYY-MM-DD
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			params.From = &t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			// Include the full end day (23:59:59)
			end := t.Add(24*time.Hour - time.Second)
			params.To = &end
		}
	}

	movements, err := h.service.List(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, movements)
}

func (h *Handler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req models.StockMovement
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.MovementType == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "movement_type is required (in, out, adjustment)")
		return
	}
	// in/out must be positive; adjustment can be any non-zero signed integer
	if req.MovementType != "adjustment" && req.Quantity <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "quantity must be greater than 0 for in/out movements")
		return
	}
	if req.MovementType == "adjustment" && req.Quantity == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "adjustment quantity must be non-zero")
		return
	}

	userID, _ := c.Get("user_id")
	if uid, ok := userID.(string); ok && uid != "" {
		req.CreatedBy = &uid
	}

	if err := h.service.Create(&req, orgID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Stock movement recorded", req)
}
