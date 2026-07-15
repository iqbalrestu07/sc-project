package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ParseIntQuery parses an integer query parameter with a fallback default value
func ParseIntQuery(c *gin.Context, key string, defaultValue int) int {
	valStr := c.Query(key)
	if valStr == "" {
		return defaultValue
	}
	val, err := strconv.Atoi(valStr)
	if err != nil || val <= 0 {
		return defaultValue
	}
	return val
}

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
	HasNext bool        `json:"has_next"`
	Page    int         `json:"page,omitempty"`
	Limit   int         `json:"limit,omitempty"`
	Total   *int        `json:"total,omitempty"`
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
func ListSuccessResponse(c *gin.Context, data interface{}, hasNext bool, page, limit int) {
	c.JSON(http.StatusOK, ListResponse{
		Success: true,
		Data:    data,
		HasNext: hasNext,
		Page:    page,
		Limit:   limit,
	})
}

func ListSuccessResponseWithTotal(c *gin.Context, data interface{}, hasNext bool, page, limit, total int) {
	c.JSON(http.StatusOK, ListResponse{
		Success: true,
		Data:    data,
		HasNext: hasNext,
		Page:    page,
		Limit:   limit,
		Total:   &total,
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
