package appointment

import (
	"errors"
	"net/http"
	"time"

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
	appointments, err := h.service.List(orgID, nil, nil)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, appointments)
}

func (h *Handler) Calendar(c *gin.Context) {
	orgID := c.GetString("org_id")
	start, err := parseOptionalTime(c.Query("start_date"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid start_date")
		return
	}
	end, err := parseOptionalTime(c.Query("end_date"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid end_date")
		return
	}
	appointments, err := h.service.List(orgID, start, end)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, appointments)
}

func (h *Handler) AvailableSlots(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, []interface{}{})
}

func (h *Handler) Get(c *gin.Context) {
	orgID := c.GetString("org_id")
	appointment, err := h.service.Get(c.Param("id"), orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponse(c, http.StatusOK, appointment)
}

func (h *Handler) Create(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req models.Appointment
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	userID := getUserID(c)
	appointment, err := h.service.Create(req, userID, orgID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Appointment created successfully", appointment)
}

func (h *Handler) Update(c *gin.Context) {
	orgID := c.GetString("org_id")
	var req models.Appointment
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	appointment, err := h.service.Update(c.Param("id"), orgID, req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Appointment updated successfully", appointment)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Appointment deleted successfully", nil)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}
	utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
}

func parseOptionalTime(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
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
