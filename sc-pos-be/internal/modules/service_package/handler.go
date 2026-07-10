package service_package

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

// NewModule wires the full handler → service → repository stack.
func NewModule() *Handler {
	return NewHandler(NewService(NewRepository()))
}

// ─── Group endpoints ──────────────────────────────────────────────────────────

// GET /services/:id/consumable-groups
func (h *Handler) ListGroups(c *gin.Context) {
	serviceID := c.Param("id")
	orgID := c.GetString("org_id")
	groups, err := h.svc.ListGroups(serviceID, orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, groups)
}

// POST /services/:id/consumable-groups
func (h *Handler) CreateGroup(c *gin.Context) {
	serviceID := c.Param("id")
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	var req struct {
		Name         string  `json:"name" binding:"required"`
		QuantityUsed float64 `json:"quantity_used" binding:"required,min=0.001"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	g := &models.ServiceConsumableGroup{
		ServiceID:    serviceID,
		Name:         req.Name,
		QuantityUsed: req.QuantityUsed,
	}
	if err := h.svc.CreateGroup(g, orgID, userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Consumable group created", g)
}

// PUT /consumable-groups/:groupId
func (h *Handler) UpdateGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	var req struct {
		Name         string  `json:"name" binding:"required"`
		QuantityUsed float64 `json:"quantity_used" binding:"required,min=0.001"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.UpdateGroup(groupID, req.Name, req.QuantityUsed, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.ErrorResponse(c, http.StatusNotFound, "consumable group not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable group updated", nil)
}

// DELETE /consumable-groups/:groupId
func (h *Handler) DeleteGroup(c *gin.Context) {
	groupID := c.Param("groupId")
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	if err := h.svc.DeleteGroup(groupID, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.ErrorResponse(c, http.StatusNotFound, "consumable group not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable group deleted", nil)
}

// ─── Group item endpoints ─────────────────────────────────────────────────────

// POST /consumable-groups/:groupId/items
func (h *Handler) AddGroupItem(c *gin.Context) {
	groupID := c.Param("groupId")
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	var req struct {
		ProductID string `json:"product_id" binding:"required"`
		Priority  int    `json:"priority"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	it := &models.ServiceConsumableGroupItem{
		GroupID:   groupID,
		ProductID: req.ProductID,
		Priority:  req.Priority,
	}
	if err := h.svc.AddGroupItem(it, orgID, userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Consumable item added", it)
}

// DELETE /consumable-group-items/:itemId
func (h *Handler) DeleteGroupItem(c *gin.Context) {
	itemID := c.Param("itemId")
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	if err := h.svc.DeleteGroupItem(itemID, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			utils.ErrorResponse(c, http.StatusNotFound, "item not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Consumable item deleted", nil)
}
