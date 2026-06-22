package whatsapp

import (
	"net/http"

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

type SendRequest struct {
	To      string `json:"to" binding:"required"`
	Message string `json:"message" binding:"required"`
}

type SendBulkRequest struct {
	Recipients []Recipient `json:"recipients" binding:"required"`
	Message    string      `json:"message" binding:"required"`
}

type Recipient struct {
	To          string `json:"to"`
	PatientName string `json:"patient_name,omitempty"`
}

func (h *Handler) Send(c *gin.Context) {
	var req SendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	result, err := h.service.Send(req.To, req.Message)
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

	results := h.service.SendBulk(req.Recipients, req.Message)
	utils.SuccessResponse(c, http.StatusOK, results)
}

func (h *Handler) Templates(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, h.service.Templates())
}
