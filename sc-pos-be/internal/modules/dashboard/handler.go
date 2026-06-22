package dashboard

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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

// parseDateRange reads ?from=YYYY-MM-DD&to=YYYY-MM-DD query params.
// Returns a zero DateRange (nil pointers) when params are absent or invalid.
func parseDateRange(c *gin.Context) DateRange {
	var dr DateRange
	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			dr.From = &t
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			// include the entire "to" day
			end := t.Add(24 * time.Hour)
			dr.To = &end
		}
	}
	// Both must be present for filtering to apply
	if dr.From == nil || dr.To == nil {
		dr.From = nil
		dr.To = nil
	}
	return dr
}

func (h *Handler) Stats(c *gin.Context) {
	data, err := h.service.Stats(parseDateRange(c))
	respond(c, data, err)
}

func (h *Handler) Revenue(c *gin.Context) {
	data, err := h.service.Revenue(parseDateRange(c))
	respond(c, data, err)
}

func (h *Handler) TopServices(c *gin.Context) {
	data, err := h.service.TopServices(parseDateRange(c))
	respond(c, data, err)
}

func (h *Handler) TopProducts(c *gin.Context) {
	data, err := h.service.TopProducts(parseDateRange(c))
	respond(c, data, err)
}

func (h *Handler) AppointmentsToday(c *gin.Context) {
	data, err := h.service.AppointmentsToday()
	respond(c, data, err)
}

func respond(c *gin.Context, data interface{}, err error) {
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, data)
}
