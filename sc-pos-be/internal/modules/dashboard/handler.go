package dashboard

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

func (h *Handler) Stats(c *gin.Context) {
	data, err := h.service.Stats()
	respond(c, data, err)
}

func (h *Handler) Revenue(c *gin.Context) {
	data, err := h.service.Revenue()
	respond(c, data, err)
}

func (h *Handler) TopServices(c *gin.Context) {
	data, err := h.service.TopServices()
	respond(c, data, err)
}

func (h *Handler) TopProducts(c *gin.Context) {
	data, err := h.service.TopProducts()
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
