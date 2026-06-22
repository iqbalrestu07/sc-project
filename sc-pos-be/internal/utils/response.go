package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// APIResponse standard response format
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// ListResponse for paginated responses
type ListResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Total   int         `json:"total,omitempty"`
	Page    int         `json:"page,omitempty"`
	Limit   int         `json:"limit,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// AuthResponse for login/register responses
type AuthResponse struct {
	Success     bool        `json:"success"`
	AccessToken string      `json:"access_token,omitempty"`
	User        interface{} `json:"user,omitempty"`
	Error       string      `json:"error,omitempty"`
}

// SuccessResponse returns success response
func SuccessResponse(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

// SuccessResponseWithMessage returns success response with message
func SuccessResponseWithMessage(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// ErrorResponse returns error response
func ErrorResponse(c *gin.Context, statusCode int, error string) {
	c.JSON(statusCode, APIResponse{
		Success: false,
		Error:   error,
	})
}

// ListSuccessResponse returns list with pagination
func ListSuccessResponse(c *gin.Context, data interface{}, total, page, limit int) {
	c.JSON(http.StatusOK, ListResponse{
		Success: true,
		Data:    data,
		Total:   total,
		Page:    page,
		Limit:   limit,
	})
}

// ListErrorResponse returns list error
func ListErrorResponse(c *gin.Context, error string) {
	c.JSON(http.StatusOK, ListResponse{
		Success: false,
		Error:   error,
	})
}

// AuthSuccessResponse returns auth success
func AuthSuccessResponse(c *gin.Context, token string, user interface{}) {
	c.JSON(http.StatusOK, AuthResponse{
		Success:     true,
		AccessToken: token,
		User:        user,
	})
}

// AuthErrorResponse returns auth error
func AuthErrorResponse(c *gin.Context, statusCode int, error string) {
	c.JSON(statusCode, AuthResponse{
		Success: false,
		Error:   error,
	})
}
