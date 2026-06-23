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
// Dates are interpreted as midnight in Asia/Jakarta (UTC+7) so they align
// correctly with paid_at values which are stored as UTC.
// Returns a zero DateRange (nil pointers) when params are absent or invalid.
func parseDateRange(c *gin.Context) DateRange {
	var dr DateRange
	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.ParseInLocation("2006-01-02", fromStr, jakartaLoc); err == nil {
			utc := t.UTC()
			dr.From = &utc
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.ParseInLocation("2006-01-02", toStr, jakartaLoc); err == nil {
			// include entire "to" day (midnight Jakarta next day = 17:00 UTC)
			end := t.Add(24 * time.Hour).UTC()
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
	orgID := c.GetString("org_id")
	data, err := h.service.Stats(parseDateRange(c), orgID)
	respond(c, data, err)
}

func (h *Handler) Revenue(c *gin.Context) {
	orgID := c.GetString("org_id")
	data, err := h.service.Revenue(parseDateRange(c), orgID)
	respond(c, data, err)
}

func (h *Handler) TopServices(c *gin.Context) {
	orgID := c.GetString("org_id")
	data, err := h.service.TopServices(parseDateRange(c), orgID)
	respond(c, data, err)
}

func (h *Handler) TopProducts(c *gin.Context) {
	orgID := c.GetString("org_id")
	data, err := h.service.TopProducts(parseDateRange(c), orgID)
	respond(c, data, err)
}

func (h *Handler) AppointmentsToday(c *gin.Context) {
	orgID := c.GetString("org_id")
	data, err := h.service.AppointmentsToday(orgID)
	respond(c, data, err)
}

func respond(c *gin.Context, data interface{}, err error) {
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, data)
}
