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
	userID := c.GetString("user_id")
	var req models.Appointment
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	appointment, err := h.service.Update(c.Param("id"), orgID, userID, req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Appointment updated successfully", appointment)
}

func (h *Handler) Delete(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")
	if err := h.service.Delete(c.Param("id"), orgID, userID); err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Appointment deleted successfully", nil)
}

// UpdateStatus handles PATCH /appointments/:id/status
// Used by the queue page to move patients between antrian → dilayani → selesai.
func (h *Handler) UpdateStatus(c *gin.Context) {
	orgID := c.GetString("org_id")
	userID := c.GetString("user_id")

	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "status is required")
		return
	}

	appointment, err := h.service.UpdateStatus(c.Param("id"), body.Status, orgID, userID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Appointment status updated", appointment)
}

// TodayQueue handles GET /appointments/today
// Returns today's appointments grouped by queue status:
//   - waiting:     scheduled + confirmed (dalam antrian)
//   - in_progress: in_progress (sedang dilayani)
//   - completed:   completed (selesai, siap bayar)
func (h *Handler) TodayQueue(c *gin.Context) {
	orgID := c.GetString("org_id")

	// Get today's range in Jakarta time
	jakarta, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(jakarta)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, jakarta)
	endOfDay := startOfDay.Add(24 * time.Hour)

	appointments, err := h.service.List(orgID, &startOfDay, &endOfDay)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Group by status
	type QueueGroup struct {
		Waiting    []AppointmentWithRelations `json:"waiting"`
		InProgress []AppointmentWithRelations `json:"in_progress"`
		Completed  []AppointmentWithRelations `json:"completed"`
		Other      []AppointmentWithRelations `json:"other"`
	}
	groups := QueueGroup{
		Waiting:    []AppointmentWithRelations{},
		InProgress: []AppointmentWithRelations{},
		Completed:  []AppointmentWithRelations{},
		Other:      []AppointmentWithRelations{},
	}
	for _, a := range appointments {
		switch a.Status {
		case "scheduled", "confirmed":
			groups.Waiting = append(groups.Waiting, a)
		case "in_progress":
			groups.InProgress = append(groups.InProgress, a)
		case "completed":
			groups.Completed = append(groups.Completed, a)
		default:
			groups.Other = append(groups.Other, a)
		}
	}

	utils.SuccessResponse(c, http.StatusOK, groups)
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
	// Convert the absolute instant to Asia/Jakarta wall-clock so the query
	// boundaries match the TIMESTAMP (without time zone) values stored in the DB.
	jakarta := utils.ToJakarta(parsed)
	return &jakarta, nil
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
