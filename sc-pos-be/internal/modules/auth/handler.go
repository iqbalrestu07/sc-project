package authmodule

import (
	"errors"
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

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		h.handleError(c, err)
		return
	}

	authResponse(c, http.StatusOK, payload)
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.Register(req.Email, req.Password, req.Role)
	if err != nil {
		h.handleError(c, err)
		return
	}

	authResponse(c, http.StatusCreated, payload)
}

func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := h.service.Refresh(req.RefreshToken)
	if err != nil {
		h.handleError(c, err)
		return
	}

	authResponse(c, http.StatusOK, payload)
}

func (h *Handler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")
	email, _ := c.Get("email")
	role, _ := c.Get("role")

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"id":    userID,
		"email": email,
		"role":  role,
	})
}

func (h *Handler) Logout(c *gin.Context) {
	utils.SuccessResponseWithMessage(c, http.StatusOK, "logged out successfully", nil)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidCredentials):
		utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrEmailAlreadyUsed):
		utils.ErrorResponse(c, http.StatusConflict, err.Error())
	default:
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
}

func authResponse(c *gin.Context, statusCode int, payload *AuthPayload) {
	c.JSON(statusCode, gin.H{
		"success":       true,
		"data":          payload,
		"access_token":  payload.AccessToken,
		"refresh_token": payload.RefreshToken,
		"user":          payload.User,
	})
}
