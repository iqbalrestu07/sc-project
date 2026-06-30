package whatsapp

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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

type SendRequest struct {
	To      string `json:"to" binding:"required"`
	Message string `json:"message" binding:"required"`
}

type SendBulkRequest struct {
	Recipients []Recipient `json:"recipients" binding:"required"`
	TemplateID string      `json:"template_id"`
	Message    string      `json:"message"`
}

type Recipient struct {
	To          string `json:"to"`
	PatientName string `json:"patient_name,omitempty"`
}

// ── Sending endpoints ───────────────────────────────────────────────────────

func (h *Handler) Send(c *gin.Context) {
	var req SendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	orgID := c.GetString("org_id")
	result, err := h.service.Send(orgID, req.To, req.Message)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, result)
}

func (h *Handler) SendBulk(c *gin.Context) {
	var req SendBulkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if req.TemplateID == "" && req.Message == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Either template_id or message is required")
		return
	}

	orgID := c.GetString("org_id")
	results := h.service.SendBulk(orgID, req.Recipients, req.TemplateID, req.Message)
	utils.SuccessResponse(c, http.StatusOK, results)
}

func (h *Handler) SendBlast(c *gin.Context) {
	var req BlastRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	orgID := c.GetString("org_id")
	result := h.service.SendBlast(orgID, req)
	utils.SuccessResponse(c, http.StatusOK, result)
}

// ── Session endpoints ───────────────────────────────────────────────────────

func (h *Handler) Status(c *gin.Context) {
	orgID := c.GetString("org_id")
	isConnected, err := h.service.Status(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"connected": isConnected})
}

func (h *Handler) LoginQR(c *gin.Context) {
	orgID := c.GetString("org_id")
	
	// Create context with timeout for QR generation
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	qrChan, err := h.service.GetLoginQR(ctx, orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// We use HTTP Server-Sent Events (SSE) to stream the QR code to the frontend
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	for {
		select {
		case qr, ok := <-qrChan:
			if !ok {
				// Channel closed means either paired or timeout
				// Let's send a success event
				c.Writer.Write([]byte("event: success\ndata: connected\n\n"))
				c.Writer.Flush()
				return
			}
			c.Writer.Write([]byte("event: qr\ndata: " + qr + "\n\n"))
			c.Writer.Flush()
		case <-ctx.Done():
			c.Writer.Write([]byte("event: timeout\ndata: timeout\n\n"))
			c.Writer.Flush()
			return
		case <-c.Request.Context().Done():
			// Client closed connection
			return
		}
	}
}

func (h *Handler) Logout(c *gin.Context) {
	orgID := c.GetString("org_id")
	err := h.service.Logout(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, nil)
}

// ── Templates endpoints ─────────────────────────────────────────────────────

func (h *Handler) Templates(c *gin.Context) {
	orgID := c.GetString("org_id")
	templates, err := h.service.Templates(orgID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, templates)
}

type CreateTemplateRequest struct {
	Name    string `json:"name" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func (h *Handler) CreateTemplate(c *gin.Context) {
	var req CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	orgID := c.GetString("org_id")
	t, err := h.service.CreateTemplate(orgID, req.Name, req.Content)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, t)
}
