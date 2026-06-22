package patient

import (
	"errors"
	"net/http"

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
	// Support optional ?search= query param for inline search
	if search := c.Query("search"); search != "" {
		patients, err := h.service.Search(search)
		if err != nil {
			h.handleError(c, err)
			return
		}
		utils.SuccessResponse(c, http.StatusOK, patients)
		return
	}

	patients, err := h.service.List()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, patients)
}

func (h *Handler) Get(c *gin.Context) {
	patient, err := h.service.Get(c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, patient)
}

func (h *Handler) Create(c *gin.Context) {
	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	patient, err := h.service.Create(req, userID.(string))
	if err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusCreated, "Patient created successfully", patient)
}

func (h *Handler) Update(c *gin.Context) {
	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	patient, err := h.service.Update(c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusOK, "Patient updated successfully", patient)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponseWithMessage(c, http.StatusOK, "Patient deleted successfully", nil)
}

func (h *Handler) Search(c *gin.Context) {
	patients, err := h.service.Search(c.Query("search"))
	if err != nil {
		h.handleError(c, err)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, patients)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrSearchRequired):
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
	default:
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
}
