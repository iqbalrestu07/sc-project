package stock

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	repo *Repository
}

func NewModule() *Handler {
	return &Handler{repo: NewRepository()}
}

func (h *Handler) List(c *gin.Context) {
	orgID := c.GetString("org_id")
	movements, err := h.repo.List(c.Query("product_id"), orgID)
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

	if err := h.repo.Create(&req, orgID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Stock movement recorded", req)
}
