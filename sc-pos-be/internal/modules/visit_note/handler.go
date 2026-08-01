package visit_note

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

// Create handles POST /patients/:id/visit-notes
func (h *Handler) Create(c *gin.Context) {
	patientID := c.Param("id")
	orgID := c.GetString("org_id")
	userID, _ := c.Get("user_id")

	var req models.VisitNote
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	req.PatientID = patientID

	note, err := h.service.Create(req, userID.(string), orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Visit note created", note)
}

// List handles GET /patients/:id/visit-notes
func (h *Handler) List(c *gin.Context) {
	patientID := c.Param("id")
	orgID := c.GetString("org_id")

	notes, err := h.service.ListByPatient(patientID, orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, notes)
}

// Get handles GET /visit-notes/:id
func (h *Handler) Get(c *gin.Context) {
	orgID := c.GetString("org_id")

	note, err := h.service.Get(c.Param("id"), orgID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, note)
}

// Update handles PUT /visit-notes/:id
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	orgID := c.GetString("org_id")
	userID, _ := c.Get("user_id")

	var req models.VisitNote
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	note, err := h.service.Update(id, req, userID.(string), orgID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusOK, "Visit note updated", note)
}

// Delete handles DELETE /visit-notes/:id
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	orgID := c.GetString("org_id")
	userID, _ := c.Get("user_id")

	if err := h.service.Delete(id, orgID, userID.(string)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusOK, "Visit note deleted", nil)
}

// parseTime parses a time string from request body (optional helper).
func parseTime(s string) (time.Time, bool) {
	if s == "" {
		return time.Time{}, false
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}
