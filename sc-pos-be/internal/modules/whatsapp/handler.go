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

func (h *Handler) Send(c *gin.Context) {
	if err := h.service.Send(); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "Message queued", nil)
}

func (h *Handler) Templates(c *gin.Context) {
	utils.SuccessResponse(c, http.StatusOK, h.service.Templates())
}
